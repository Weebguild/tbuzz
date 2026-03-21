import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/sanitize-error";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Image, Loader2, Plus, X, MoreVertical, Bookmark, Trophy, Search, Share, ArrowUp, Flame, Clock } from "lucide-react";
import { UserSearch } from "@/components/UserSearch";
import { SuggestedConnections } from "@/components/feed/SuggestedConnections";
import { HeartBurst } from "@/components/feed/HeartBurst";
import { PostSkeleton } from "@/components/ui/PostSkeleton";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { TrendingTicker } from "@/components/feed/TrendingTicker";
import { PostImageExpander } from "@/components/feed/PostImageExpander";
import { ImagePreviewEditor } from "@/components/feed/ImagePreviewEditor";
import { NeonSparkOverlay } from "@/components/feed/NeonSparkOverlay";
import { ActivityDrawer } from "@/components/layout/ActivityDrawer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
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
  has_saved: boolean;
}

import { CommentItem, type Comment } from "@/components/feed/CommentItem";

interface TrendingGossip {
  id: string;
  gossip_alias: string;
  content: string;
  score: number;
}

const PAGE_SIZE = 20;

export default function Feed() {
  const { user, profile } = useAuth();
  const { getHaloClass } = useHalo();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);


  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageConfirmed, setImageConfirmed] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, { commentId: string, displayName: string } | null>>({});
  const [trendingGossip, setTrendingGossip] = useState<TrendingGossip[]>([]);
  const [expandedImage, setExpandedImage] = useState<Post | null>(null);
  const [shareExpandedPost, setShareExpandedPost] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [filterMode, setFilterMode] = useState<"latest" | "trending">("latest");

  // Deep-link: scroll to post from notification
  const deepLinkPostId = searchParams.get("postId");
  useEffect(() => {
    if (loading || posts.length === 0 || !deepLinkPostId) return;

    const showComments = searchParams.get("showComments") === "true";

    // Small delay to let DOM render
    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${deepLinkPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedPostId(deepLinkPostId);
        if (showComments) {
          setExpandedComments((prev) => new Set(prev).add(deepLinkPostId));
          loadComments(deepLinkPostId);
        }
        setSearchParams({}, { replace: true });
        setTimeout(() => setHighlightedPostId(null), 2500);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loading, posts.length, deepLinkPostId]);

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase.from("follows").select("following_user_id").eq("follower_user_id", user.id);
    setFollowingIds(new Set(data?.map((f) => f.following_user_id) ?? []));
  };

  const fetchTrendingGossip = async () => {
    if (!profile) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: gossipPosts } = await supabase
      .from("anonymous_gossip_posts")
      .select("id, gossip_alias, content, created_at")
      .eq("university_id", profile.university_id)
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!gossipPosts || gossipPosts.length === 0) return;

    const postIds = gossipPosts.map((p) => p.id);
    const { data: scores } = await supabase.from("gossip_posts").select("id, hotness_score").in("id", postIds);

    const scored = gossipPosts.map((p) => {
      const postScore = scores?.find((s) => s.id === p.id)?.hotness_score ?? 0;
      return { ...p, score: postScore };
    });

    scored.sort((a, b) => b.score - a.score);
    setTrendingGossip(scored.slice(0, 3));
  };

  const enrichPosts = useCallback(async (postsData: any[], append = false, isTrending = false) => {
    if (!user) return;
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const postIds = postsData.map((p) => p.id);

    const [{ data: profiles }, { data: reactions }, { data: comments }, { data: savedPosts }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
      supabase.from("reactions").select("post_id, user_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    let enriched: Post[] = postsData.map((post) => ({
      ...post,
      profiles: profiles?.find((p) => p.user_id === post.user_id),
      reaction_count: reactions?.filter((r) => r.post_id === post.id).length ?? 0,
      comment_count: comments?.filter((c) => c.post_id === post.id).length ?? 0,
      has_liked: reactions?.some((r) => r.post_id === post.id && r.user_id === user?.id) ?? false,
      has_saved: savedPosts?.some((s) => s.post_id === post.id) ?? false,
    }));

    if (isTrending) {
      enriched.sort((a, b) => b.reaction_count - a.reaction_count);
      // Optional: limit to top 30
      enriched = enriched.slice(0, 30);
    }

    if (append) {
      setPosts((prev) => [...prev, ...enriched]);
    } else {
      setPosts(enriched);
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    if (!profile) return;
    if (filterMode === "trending") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .eq("university_id", profile.university_id)
        .neq("is_archived", true)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[Feed]", sanitizeError(error));
        return;
      }
      setHasMore(false); // No infinite scroll for trending
      await enrichPosts(postsData, false, true);
      setLoading(false);
    } else {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .eq("university_id", profile.university_id)
        .neq("is_archived", true)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (error) {
        console.error("[Feed]", sanitizeError(error));
        return;
      }

      setHasMore(postsData.length === PAGE_SIZE);
      await enrichPosts(postsData);
      setLoading(false);
    }
  }, [profile, filterMode, enrichPosts]);

  const fetchMorePosts = useCallback(async () => {
    if (!profile || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = posts.length;
    const to = from + PAGE_SIZE - 1;

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .eq("university_id", profile.university_id)
      .neq("is_archived", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[Feed]", sanitizeError(error));
      setLoadingMore(false);
      return;
    }

    setHasMore(postsData.length === PAGE_SIZE);
    await enrichPosts(postsData, true);
    setLoadingMore(false);
  }, [profile, posts.length, loadingMore, hasMore, enrichPosts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchMorePosts();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchMorePosts]);

  useEffect(() => {
    fetchFollowing();
  }, [user]);
  useEffect(() => {
    setLoading(true);
    fetchPosts();
    fetchTrendingGossip();
  }, [profile, filterMode]);

  // Keep a ref to the latest fetchPosts so the channel doesn't tear down on every recreation
  const fetchPostsRef = useRef(fetchPosts);
  useEffect(() => { fetchPostsRef.current = fetchPosts; }, [fetchPosts]);

  // ── REALTIME: only listen for new posts from others ──
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `university_id=eq.${profile.university_id}` }, (payload) => {
        if (payload.new && payload.new.user_id !== user?.id) {
          setHasNewPosts(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.university_id, user?.id]);

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
      setNewPost("");
      setImageFile(null);
      setImageConfirmed(false);
      setShowComposer(false);
      toast.success("Posted!");
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setPosting(false);
    }
  };

  const likingRef = useRef<Set<string>>(new Set());
  const [burstingPostId, setBurstingPostId] = useState<string | null>(null);

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user || likingRef.current.has(postId)) return;
    likingRef.current.add(postId);

    // Optimistic update
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, has_liked: !hasLiked, reaction_count: p.reaction_count + (hasLiked ? -1 : 1) }
        : p
    ));

    if (!hasLiked) setBurstingPostId(postId);

    try {
      if (hasLiked) {
        await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("reaction_type", "like");
      } else {
        await supabase.from("reactions").insert({ user_id: user.id, post_id: postId, reaction_type: "like" });
      }
    } catch {
      // Revert on error
      setPosts((prev) => prev.map((p) =>
        p.id === postId
          ? { ...p, has_liked: hasLiked, reaction_count: p.reaction_count + (hasLiked ? 1 : -1) }
          : p
      ));
    } finally {
      likingRef.current.delete(postId);
    }
  };

  const toggleSave = async (postId: string, hasSaved: boolean) => {
    if (!user) return;
    // Optimistic update
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, has_saved: !hasSaved } : p));
    if (hasSaved) {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("saved_posts").insert({ user_id: user.id, post_id: postId });
    }
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
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
    setDeletePostId(null);
  };

  const archivePost = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", postId);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Post archived");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!data) return;

    const uids = [...new Set(data.map((c) => c.user_id))];
    const commentIds = data.map((c) => c.id);

    const [{ data: profiles }, { data: reactions }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids),
      supabase.from("comment_reactions").select("comment_id, user_id").in("comment_id", commentIds)
    ]);

    // Build flat enriched list
    const enriched = data.map((c) => {
      const p = profiles?.find((pr) => pr.user_id === c.user_id);
      const cReactions = reactions?.filter((r) => r.comment_id === c.id) || [];
      return {
        ...c,
        display_name: p?.display_name ?? "Unknown",
        avatar_url: p?.avatar_url ?? null,
        reaction_count: cReactions.length,
        has_liked: user ? cReactions.some((r) => r.user_id === user.id) : false,
        replies: []
      };
    });

    // Build tree
    const commentMap = new Map<string, Comment>();
    enriched.forEach(c => commentMap.set(c.id, c as Comment));

    const rootComments: Comment[] = [];
    enriched.forEach(c => {
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id)!.replies!.push(commentMap.get(c.id)!);
      } else {
        rootComments.push(commentMap.get(c.id)!);
      }
    });

    setCommentsMap((prev) => ({ ...prev, [postId]: rootComments }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        loadComments(postId);
      }
      return next;
    });
  };

  const toggleCommentLike = async (commentId: string, hasLiked: boolean, postId: string) => {
    if (!user) return;

    // Optimistic update
    setCommentsMap(prev => {
      const updateTree = (nodes: Comment[]): Comment[] => {
        return nodes.map(node => {
          if (node.id === commentId) {
            return {
              ...node,
              has_liked: !hasLiked,
              reaction_count: (node.reaction_count || 0) + (hasLiked ? -1 : 1)
            };
          }
          if (node.replies && node.replies.length > 0) {
            return { ...node, replies: updateTree(node.replies) };
          }
          return node;
        });
      };

      const postComments = prev[postId] || [];
      return { ...prev, [postId]: updateTree(postComments) };
    });

    try {
      if (hasLiked) {
        await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_reactions").insert({ user_id: user.id, comment_id: commentId } as any);
      }
    } catch (e) {
      loadComments(postId); // revert
    }
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;

    const parentId = replyingTo[postId]?.commentId || null;

    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      post_id: postId,
      content: text,
      parent_id: parentId
    } as any);

    if (error) {
      toast.error(sanitizeError(error));
      return;
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setReplyingTo(prev => ({ ...prev, [postId]: null }));

    // Optimistic comment count update
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    loadComments(postId);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageConfirmed(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Search overlay */}
      <AnimatePresence>
        {showSearch && <UserSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>

      {/* New Posts Pill */}
      <AnimatePresence>
        {hasNewPosts && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setHasNewPosts(false);
                fetchPostsRef.current();
              }}
              className="bg-primary text-white px-4 py-2 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.5)] text-sm font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <ArrowUp className="h-4 w-4" />
              New posts available
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-4xl tracking-widest text-foreground uppercase drop-shadow-md">Feed</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="flex h-10 w-10 items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Trophy className="h-5 w-5" />
          </button>
          <ActivityDrawer />
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setFilterMode("latest")}
          className={`flex items-center px-4 py-2 rounded-full text-xs font-bold transition-all ${filterMode === "latest" ? "bg-foreground text-background" : "bg-black/40 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"}`}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Latest
        </button>
        <button
          onClick={() => setFilterMode("trending")}
          className={`flex items-center px-4 py-2 rounded-full text-xs font-bold transition-all ${filterMode === "trending" ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "bg-black/40 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"}`}
        >
          <Flame className="h-3.5 w-3.5 mr-1.5" />
          Trending
        </button>
      </div>

      {/* Trending Gossip Ticker */}
      <TrendingTicker items={trendingGossip} />

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-5 rounded-3xl glass-panel p-4">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9 ring-1 ring-white/10">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                      {profile?.display_name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="What's happening on campus?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={3}
                    className="bg-black/20 border border-white/10 rounded-xl resize-none text-sm p-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
                  />

                  {imageFile && !imageConfirmed && (
                    <ImagePreviewEditor
                      file={imageFile}
                      onConfirm={(f) => {
                        setImageFile(f);
                        setImageConfirmed(true);
                      }}
                      onCancel={() => {
                        setImageFile(null);
                        setImageConfirmed(false);
                      }}
                    />
                  )}
                  {imageFile && imageConfirmed && (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="Attached"
                        className="rounded-xl max-h-32 object-cover border border-white/10"
                      />
                      <button
                        onClick={() => {
                          setImageFile(null);
                          setImageConfirmed(false);
                        }}
                        className="absolute top-1 right-1 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-white/5">
                      <Image className="h-5 w-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                    <button
                      onClick={handlePost}
                      disabled={posting || !newPost.trim()}
                      className="px-5 py-2 rounded-full bg-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] text-xs font-semibold disabled:opacity-40 disabled:shadow-none transition-transform active:scale-95"
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
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-24 text-center px-6 flex flex-col items-center justify-center bg-[#0a0a0c] rounded-3xl border border-white/5"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Your feed is quiet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-[240px] mx-auto">
              Follow more people or be the first to drop some buzz on campus.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowComposer(true)}
              className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Create Post
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {posts.map((post, i) => (
              <ErrorBoundary key={`eb-${post.id}`}>
                {i === 2 && (
                  <SuggestedConnections followingIds={followingIds} onFollowToggle={toggleFollow} />
                )}
                <motion.div
                  key={post.id}
                  id={`post-${post.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                >
                  <div className={`rounded-3xl glass-panel overflow-hidden transition-all duration-500 ${highlightedPostId === post.id ? "ring-2 ring-primary/60 shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "hover:border-primary/30"}`}>
                    {/* Post header */}
                    <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                      <button onClick={() => navigate(`/profile/${post.user_id}`)} className="shrink-0">
                        <Avatar className={cn("h-9 w-9", getHaloClass(post.user_id))}>
                          {post.profiles?.avatar_url ? (
                            <AvatarImage src={post.profiles.avatar_url} />
                          ) : (
                            <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                              {post.profiles?.display_name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </button>
                      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                        <UserHoverCard userId={post.user_id}>
                          <button
                            onClick={() => navigate(`/profile/${post.user_id}`)}
                            className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                          >
                            {post.profiles?.display_name ?? "Unknown"}
                          </button>
                        </UserHoverCard>
                        {filterMode === "trending" && i < 3 && (
                          <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/50 flex items-center gap-1">
                            <Flame className="h-3 w-3" /> TOP
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground/80 w-full sm:w-auto">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {post.user_id !== user?.id ? (
                        <button
                          onClick={() => toggleFollow(post.user_id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${followingIds.has(post.user_id) ? "border border-white/10 text-muted-foreground hover:bg-white/5" : "bg-white/10 text-foreground hover:bg-white/20"}`}
                        >
                          {followingIds.has(post.user_id) ? "Following" : "Follow"}
                        </button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10">
                            <DropdownMenuItem
                              onClick={() => archivePost(post.id)}
                              className="text-foreground focus:bg-white/5 cursor-pointer"
                            >
                              Archive Post
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletePostId(post.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Post image */}
                    {post.image_url && (
                      <NeonSparkOverlay
                        className="w-full mt-2 cursor-pointer overflow-hidden rounded-2xl"
                        onDoubleTap={() => {
                          if (!post.has_liked) toggleLike(post.id, false);
                        }}
                        onSingleTap={() => setExpandedImage(post)}
                      >
                        <motion.img
                          layoutId={`post-img-${post.id}`}
                          src={post.image_url + (post.image_url.includes('?') ? '&' : '?') + 'width=600&quality=80'}
                          alt="Post"
                          className="w-full max-h-80 object-cover pointer-events-none opacity-0 transition-opacity duration-500 ease-in-out"
                          loading="lazy"
                          onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        />
                      </NeonSparkOverlay>
                    )}

                    {/* Post content */}
                    <div className="px-4 py-3">
                      <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                    </div>

                    {/* Action row */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.button
                          onClick={() => toggleLike(post.id, post.has_liked)}
                          whileTap={{ scale: 1.3 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className={`relative flex items-center gap-1.5 text-sm transition-colors ${post.has_liked ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <div className="relative flex items-center justify-center h-5 w-5">
                            <HeartBurst show={burstingPostId === post.id} onComplete={() => setBurstingPostId(null)} />
                            <Heart className={`h-4 w-4 transition-opacity ${post.has_liked ? "fill-current" : ""} ${burstingPostId === post.id ? "opacity-0" : "opacity-100"}`} />
                          </div>
                          {post.reaction_count > 0 && <span className="text-xs font-medium">{post.reaction_count}</span>}
                        </motion.button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {post.comment_count > 0 && <span className="text-xs font-medium">{post.comment_count}</span>}
                        </button>
                        <motion.button
                          onClick={() => {
                            setShareExpandedPost(true);
                            setExpandedImage(post);
                          }}
                          whileTap={{ scale: 1.4 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Share className="h-4 w-4" />
                        </motion.button>
                      </div>
                      <motion.button
                        onClick={() => toggleSave(post.id, post.has_saved)}
                        whileTap={{ scale: 1.4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        className={`text-sm transition-colors ${post.has_saved ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Bookmark className={`h-4 w-4 ${post.has_saved ? "fill-current" : ""}`} />
                      </motion.button>
                    </div>

                    {/* Comments */}
                    <AnimatePresence>
                      {expandedComments.has(post.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 bg-black/20"
                        >
                          {(commentsMap[post.id] ?? []).map((c) => (
                            <CommentItem
                              key={c.id}
                              comment={c}
                              postId={post.id}
                              currentUserId={user?.id ?? null}
                              onReply={(commentId, displayName) => {
                                setReplyingTo(prev => ({ ...prev, [post.id]: { commentId, displayName } }));
                              }}
                              onToggleLike={toggleCommentLike}
                            />
                          ))}
                          {replyingTo[post.id] && (
                            <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-t-xl mb-[-4px] border-x border-t border-white/10 z-0 opacity-80 mt-2">
                              <span className="text-[10px] text-muted-foreground">Replying to <span className="text-foreground font-semibold">@{replyingTo[post.id]?.displayName}</span></span>
                              <button onClick={() => setReplyingTo(prev => ({ ...prev, [post.id]: null }))} className="text-muted-foreground hover:text-white transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <div className={`flex gap-2 ${replyingTo[post.id] ? "mt-0 z-10 relative" : "mt-2"}`}>
                            <Input
                              placeholder={replyingTo[post.id] ? "Write a reply..." : "Write a comment..."}
                              value={commentInputs[post.id] ?? ""}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                              className={`h-9 bg-black/40 border-white/10 text-xs pl-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50 ${replyingTo[post.id] ? "rounded-b-xl rounded-t-none border-x border-b border-t-0" : "rounded-full border"}`}
                            />
                            <button
                              onClick={() => submitComment(post.id)}
                              disabled={!commentInputs[post.id]?.trim()}
                              className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-30 disabled:bg-white/10 shrink-0 transition-transform active:scale-95 shadow-[0_0_10px_rgba(124,58,237,0.3)] disabled:shadow-none"
                            >
                              <Send className="h-3.5 w-3.5 ml-0.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </ErrorBoundary>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Fullscreen image expander */}
      <AnimatePresence>
        {expandedImage && expandedImage.image_url && (
          <PostImageExpander
            postId={expandedImage.id}
            imageUrl={expandedImage.image_url}
            hasLiked={expandedImage.has_liked}
            hasSaved={expandedImage.has_saved}
            reactionCount={expandedImage.reaction_count}
            commentCount={expandedImage.comment_count}
            defaultOpenSharePanel={shareExpandedPost}
            onClose={() => {
              setExpandedImage(null);
              setShareExpandedPost(false);
            }}
            onToggleLike={() => toggleLike(expandedImage.id, expandedImage.has_liked)}
            onToggleSave={() => toggleSave(expandedImage.id, expandedImage.has_saved)}
            onCommentAdded={() => {
              setPosts((prev) => prev.map((p) => p.id === expandedImage.id ? { ...p, comment_count: p.comment_count + 1 } : p));
              setExpandedImage(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent className="bg-[#0A0A0A] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-foreground hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deletePost(deletePostId)}
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
