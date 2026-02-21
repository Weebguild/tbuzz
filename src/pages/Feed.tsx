import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Image, Loader2, Plus, X, Search, UserPlus, UserMinus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  is_following: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface SearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function Feed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("following_user_id")
      .eq("follower_user_id", user.id);
    setFollowingIds(new Set(data?.map((f) => f.following_user_id) ?? []));
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
      is_following: followingIds.has(post.user_id),
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchFollowing(); }, [user]);
  useEffect(() => { fetchPosts(); }, [profile, followingIds]);

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
      setNewPost(""); setImageFile(null); setShowComposer(false);
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !profile) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .eq("university_id", profile.university_id)
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user?.id ?? "")
      .limit(5);
    setSearchResults(data ?? []);
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

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campus..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 h-11 rounded-full bg-muted border-0 text-sm placeholder:text-muted-foreground"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-2 rounded-2xl border border-border bg-background shadow-lg overflow-hidden">
            <div className="p-2 space-y-0.5">
              {searchResults.map((r) => (
                <div key={r.user_id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {r.avatar_url ? <AvatarImage src={r.avatar_url} /> : <AvatarFallback className="bg-muted text-xs font-bold">{r.display_name.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <span className="text-sm font-semibold">{r.display_name}</span>
                  </div>
                  <button
                    onClick={() => toggleFollow(r.user_id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${followingIds.has(r.user_id) ? "border border-border text-foreground" : "bg-foreground text-background"}`}
                  >
                    {followingIds.has(r.user_id) ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-5 rounded-2xl border border-border bg-background p-4">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : <AvatarFallback className="bg-muted text-xs font-bold">{profile?.display_name?.charAt(0) ?? "?"}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea placeholder="What's happening on campus?" value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={3} className="border-0 bg-muted rounded-xl resize-none text-sm p-3" />
                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                      <Image className="h-5 w-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                    </label>
                    <button
                      onClick={handlePost}
                      disabled={posting || !newPost.trim()}
                      className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-semibold disabled:opacity-40 transition-transform active:scale-95"
                    >
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                    </button>
                  </div>
                  {imageFile && <p className="text-xs text-muted-foreground">📎 {imageFile.name}</p>}
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
              <div className="rounded-2xl border border-border bg-background overflow-hidden">
                {/* Post header */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {post.profiles?.avatar_url ? <AvatarImage src={post.profiles.avatar_url} /> : <AvatarFallback className="bg-muted text-xs font-bold">{post.profiles?.display_name?.charAt(0) ?? "?"}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{post.profiles?.display_name ?? "Unknown"}</span>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                  </div>
                  {post.user_id !== user?.id && (
                    <button
                      onClick={() => toggleFollow(post.user_id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${followingIds.has(post.user_id) ? "border border-border text-muted-foreground" : "bg-foreground text-background"}`}
                    >
                      {followingIds.has(post.user_id) ? "Following" : "Follow"}
                    </button>
                  )}
                </div>

                {/* Post image */}
                {post.image_url && (
                  <img src={post.image_url} alt="Post" className="w-full max-h-80 object-cover" loading="lazy" />
                )}

                {/* Post content */}
                <div className="px-4 py-3">
                  <p className="text-sm leading-relaxed">{post.content}</p>
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
                  <div className="flex-1" />
                  <button onClick={() => toggleComments(post.id)} className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
                    View Post
                  </button>
                </div>

                {/* Comments */}
                {expandedComments.has(post.id) && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {(commentsMap[post.id] ?? []).map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar className="h-6 w-6">
                          {c.avatar_url ? <AvatarImage src={c.avatar_url} /> : <AvatarFallback className="bg-muted text-[10px] font-bold">{c.display_name.charAt(0)}</AvatarFallback>}
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{c.display_name}</span>
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
                        className="h-9 rounded-full bg-muted border-0 text-xs pl-4"
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
    </div>
  );
}
