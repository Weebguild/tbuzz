import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Image, Loader2, Plus, X, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { TrendingTicker } from "@/components/feed/TrendingTicker";
import { PostImageExpander } from "@/components/feed/PostImageExpander";
import { ImagePreviewEditor } from "@/components/feed/ImagePreviewEditor";
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

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string; avatar_url: string | null };
  reaction_count: number;
  comment_count: number;
  has_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface TrendingGossip {
  id: string;
  gossip_alias: string;
  content: string;
}

export default function Feed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageConfirmed, setImageConfirmed] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [trendingGossip, setTrendingGossip] = useState<TrendingGossip[]>([]);
  const [expandedImage, setExpandedImage] = useState<Post | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase.from("follows").select("following_user_id").eq("follower_user_id", user.id);
    setFollowingIds(new Set(data?.map((f) => f.following_user_id) ?? []));
  };

  const fetchTrendingGossip = async () => {
    if (!profile) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: gossipPosts } = await supabase
      .from("gossip_posts")
      .select("id, gossip_alias, content, created_at")
      .eq("university_id", profile.university_id)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!gossipPosts || gossipPosts.length === 0) return;

    const postIds = gossipPosts.map((p) => p.id);
    const { data: reactions } = await supabase.from("reactions").select("gossip_post_id").in("gossip_post_id", postIds);

    const scored = gossipPosts.map((p) => ({
      ...p,
      score: reactions?.filter((r) => r.gossip_post_id === p.id).length ?? 0,
    }));
    scored.sort((a, b) => b.score - a.score);
    setTrendingGossip(scored.slice(0, 3));
  };

  const fetchPosts = async () => {
    if (!profile) return;
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.error(error); return; }

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const postIds = postsData.map((p) => p.id);

    const [{ data: profiles }, { data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
      supabase.from("reactions").select("post_id, user_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

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

  useEffect(() => { fetchFollowing(); }, [user]);
  useEffect(() => { fetchPosts(); fetchTrendingGossip(); }, [profile, followingIds]);

  const handlePost = async () => {
    if (!user || !profile || !newPost.trim()) return;
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile && imageConfirmed) {
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
      setNewPost(""); setImageFile(null); setImageConfirmed(false); setShowComposer(false);
      toast.success("Posted!");
      fetchPosts();
    } catch (error: any) { toast.error(error.message); }
    finally { setPosting(false); }
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;
    if (hasLiked) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, post_id: postId, reaction_type: "like" });
    }
    fetchPosts();
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;
    if (followingIds.has(targetUserId)) {
      await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", targetUserId);
    } else {
      await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: targetUserId });
    }
    await fetchFollowing();
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast.error(error.message); } else { toast.success("Post deleted"); fetchPosts(); }
    setDeletePostId(null);
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const uids = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
    const enriched = data.map((c) => {
      const p = profiles?.find((pr) => pr.user_id === c.user_id);
      return { ...c, display_name: p?.display_name ?? "Unknown", avatar_url: p?.avatar_url ?? null };
    });
    setCommentsMap((prev) => ({ ...prev, [postId]: enriched }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); } else { next.add(postId); loadComments(postId); }
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    const { error } = await supabase.from("comments").insert({ user_id: user.id, post_id: postId, content: text });
    if (error) { toast.error(error.message); return; }
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    loadComments(postId);
    fetchPosts();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImageConfirmed(false); }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Feed</h1>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95"
        >
          {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      {/* Trending Gossip Ticker */}
      <TrendingTicker items={trendingGossip} />

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-5 rounded-2xl border border-border bg-card p-4">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : <AvatarFallback className="bg-muted text-xs font-bold text-foreground">{profile?.display_name?.charAt(0) ?? "?"}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea placeholder="What's happening on campus?" value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={3} className="border-0 bg-muted rounded-xl resize-none text-sm p-3 text-foreground placeholder:text-muted-foreground" />

                  {/* Image preview editor */}
                  {imageFile && !imageConfirmed && (
                    <ImagePreviewEditor
                      file={imageFile}
                      onConfirm={(f) => { setImageFile(f); setImageConfirmed(true); }}
                      onCancel={() => { setImageFile(null); setImageConfirmed(false); }}
                    />
                  )}
                  {imageFile && imageConfirmed && (
                    <div className="relative">
                      <img src={URL.createObjectURL(imageFile)} alt="Attached" className="rounded-xl max-h-32 object-cover" />
                      <button onClick={() => { setImageFile(null); setImageConfirmed(false); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                      <Image className="h-5 w-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                    <button
                      onClick={handlePost}
                      disabled={posting || !newPost.trim()}
                      className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-semibold disabled:opacity-40 transition-transform active:scale-95"
                    >
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                    </button>
                  </div>
                </div>
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
          <p className="text-muted-foreground text-sm">No posts yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Post header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                  <button onClick={() => navigate(`/profile/${post.user_id}`)} className="shrink-0">
                    <Avatar className="h-9 w-9">
                      {post.profiles?.avatar_url ? <AvatarImage src={post.profiles.avatar_url} /> : <AvatarFallback className="bg-muted text-xs font-bold text-foreground">{post.profiles?.display_name?.charAt(0) ?? "?"}</AvatarFallback>}
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/profile/${post.user_id}`)} className="font-semibold text-sm text-foreground hover:underline">{post.profiles?.display_name ?? "Unknown"}</button>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                  </div>
                  {post.user_id !== user?.id ? (
                    <button
                      onClick={() => toggleFollow(post.user_id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${followingIds.has(post.user_id) ? "border border-border text-muted-foreground" : "bg-foreground text-background"}`}
                    >
                      {followingIds.has(post.user_id) ? "Following" : "Follow"}
                    </button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-elevated border-border">
                        <DropdownMenuItem
                          onClick={() => setDeletePostId(post.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Post image - tappable for fullscreen */}
                {post.image_url && (
                  <button className="w-full" onClick={() => setExpandedImage(post)}>
                    <img src={post.image_url} alt="Post" className="w-full max-h-80 object-cover" loading="lazy" />
                  </button>
                )}

                {/* Post content */}
                <div className="px-4 py-3">
                  <p className="text-sm leading-relaxed text-foreground">{post.content}</p>
                </div>

                {/* Action row */}
                <div className="px-4 pb-3 flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id, post.has_liked)} className={`flex items-center gap-1.5 text-sm transition-colors ${post.has_liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                    {post.reaction_count > 0 && <span className="text-xs font-medium">{post.reaction_count}</span>}
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    {post.comment_count > 0 && <span className="text-xs font-medium">{post.comment_count}</span>}
                  </button>
                </div>

                {/* Comments */}
                {expandedComments.has(post.id) && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {(commentsMap[post.id] ?? []).map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <button onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0">
                          <Avatar className="h-6 w-6">
                            {c.avatar_url ? <AvatarImage src={c.avatar_url} /> : <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">{c.display_name.charAt(0)}</AvatarFallback>}
                          </Avatar>
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/profile/${c.user_id}`)} className="text-xs font-semibold text-foreground hover:underline">{c.display_name}</button>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/80">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] ?? ""}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                        className="h-9 rounded-full bg-muted border-0 text-xs pl-4 text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => submitComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-foreground text-background disabled:opacity-30 shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Fullscreen image expander */}
      <AnimatePresence>
        {expandedImage && expandedImage.image_url && (
          <PostImageExpander
            imageUrl={expandedImage.image_url}
            hasLiked={expandedImage.has_liked}
            reactionCount={expandedImage.reaction_count}
            commentCount={expandedImage.comment_count}
            onClose={() => setExpandedImage(null)}
            onToggleLike={() => { toggleLike(expandedImage.id, expandedImage.has_liked); setExpandedImage(null); }}
            onToggleComments={() => { toggleComments(expandedImage.id); setExpandedImage(null); }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent className="bg-elevated border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePostId && deletePost(deletePostId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
