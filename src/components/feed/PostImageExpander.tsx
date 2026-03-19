import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { X, Heart, MessageCircle, Send, Loader2, Bookmark, Share, Search, CheckCircle2 } from "lucide-react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MicroExpander } from "@/components/ui/micro-expander";
import { debounce } from "lodash";

import { CommentItem, type Comment } from "@/components/feed/CommentItem";

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface ShareUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  conversation_id: string;
}

interface PostImageExpanderProps {
  postId: string;
  imageUrl: string;
  images?: string[];
  hasLiked: boolean;
  hasSaved?: boolean;
  reactionCount: number;
  commentCount: number;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleSave?: () => void;
  onCommentAdded?: () => void;
  defaultOpenSharePanel?: boolean;
}

export function PostImageExpander({
  postId,
  imageUrl,
  images,
  hasLiked,
  hasSaved = false,
  reactionCount,
  commentCount,
  onClose,
  onToggleLike,
  onToggleSave,
  onCommentAdded,
  defaultOpenSharePanel = false,
}: PostImageExpanderProps) {
  const { getHaloClass } = useHalo();
  const { user } = useAuth();
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(defaultOpenSharePanel);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentLimit, setCommentLimit] = useState(30);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string, displayName: string } | null>(null);
  
  // Share Panel States
  const [shareUsers, setShareUsers] = useState<ShareUser[]>([]);
  const [filteredShareUsers, setFilteredShareUsers] = useState<ShareUser[]>([]);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);

  const [sparks, setSparks] = useState<Spark[]>([]);
  const tapTimer = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const displayImages = images?.length ? images : [imageUrl];
  const [activeIndex, setActiveIndex] = useState(0);

  const [localLiked, setLocalLiked] = useState(hasLiked);
  const [localLikeCount, setLocalLikeCount] = useState(reactionCount);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);
  const [localSaved, setLocalSaved] = useState(hasSaved);

  // Drag-to-dismiss
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [0, 300], [1, 0]);
  const dragScale = useTransform(dragY, [0, 300], [1, 0.85]);

  // Hide bottom nav on mount
  useEffect(() => {
    document.body.setAttribute("data-expander-open", "true");
    return () => {
      document.body.removeAttribute("data-expander-open");
    };
  }, []);

  // Load Share Users
  const loadShareUsers = async () => {
    if (!user) return;
    try {
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations?.length) return;
      const convIds = participations.map(p => p.conversation_id);

      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id);

      const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) ?? [])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherUserIds)
        .limit(50); // Limit to recent 50 for performance

      const formattedUsers: ShareUser[] = [];
      const seenIds = new Set();
      
      for (const p of allParticipants || []) {
        if (seenIds.has(p.user_id)) continue;
        const profile = profiles?.find(prof => prof.user_id === p.user_id);
        if (profile) {
          seenIds.add(p.user_id);
          formattedUsers.push({
            user_id: profile.user_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            conversation_id: p.conversation_id
          });
        }
      }

      setShareUsers(formattedUsers);
      setFilteredShareUsers(formattedUsers);
    } catch (e) {
      console.error("Error loading share users", e);
    }
  };

  useEffect(() => {
    if (isSharePanelOpen && shareUsers.length === 0) {
      loadShareUsers();
    }
  }, [isSharePanelOpen]);

  // Handle Share Search
  useEffect(() => {
    const handleSearch = debounce(() => {
      if (!shareSearchQuery.trim()) {
        setFilteredShareUsers(shareUsers);
        return;
      }
      const q = shareSearchQuery.toLowerCase();
      setFilteredShareUsers(shareUsers.filter(u => u.display_name.toLowerCase().includes(q)));
    }, 300);
    
    handleSearch();
    return () => handleSearch.cancel();
  }, [shareSearchQuery, shareUsers]);

  const handleShareClick = () => {
    setIsSharePanelOpen(true);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Check out this post',
      url: `${window.location.origin}/post/${postId}`
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopyLink();
      }
    } catch (err) {
      console.error("Error sharing", err);
    }
  };

  const handleSendToSelected = async () => {
    if (!user || selectedUserIds.size === 0) return;
    setIsSharing(true);
    
    const url = `${window.location.origin}/post/${postId}`;
    const selectedUsers = shareUsers.filter(u => selectedUserIds.has(u.user_id));
    
    try {
      const messagePromises = selectedUsers.map(u => 
        supabase.from("messages").insert({
          conversation_id: u.conversation_id,
          sender_id: user.id,
          content: JSON.stringify({ 
            type: "post_share", 
            postId, 
            imageUrl: displayImages[activeIndex], 
            text: "Check out this post" 
          }),
        } as any)
      );
      
      await Promise.all(messagePromises);
      toast.success("Sent to selected friends");
      setIsSharePanelOpen(false);
      setSelectedUserIds(new Set());
    } catch (error) {
      toast.error("Failed to send some messages");
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (!isSplitScreen) return;
    const channel = supabase
      .channel(`public:comments:post_id=eq.${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, isSplitScreen]);

  const loadComments = async () => {
    if (comments.length === 0) setLoadingComments(true);
    
    const { data, count } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id", { count: "exact" })
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(commentLimit);

    if (!data || data.length === 0) {
      setComments([]);
      setLoadingComments(false);
      setHasMoreComments(false);
      return;
    }

    setHasMoreComments(count !== null && count > data.length);

    const uids = [...new Set(data.map((c) => c.user_id))];
    const commentIds = data.map((c) => c.id);

    const [{ data: profiles }, { data: reactions }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids),
      supabase.from("comment_reactions").select("comment_id, user_id").in("comment_id", commentIds)
    ]);

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
      } as Comment;
    });

    const commentMap = new Map<string, Comment>();
    enriched.forEach(c => commentMap.set(c.id, c));

    const rootComments: Comment[] = [];
    enriched.forEach(c => {
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id)!.replies!.push(commentMap.get(c.id)!);
      } else {
        rootComments.push(commentMap.get(c.id)!);
      }
    });

    setComments(rootComments);
    setLoadingComments(false);
  };

  useEffect(() => {
    if (isSplitScreen) loadComments();
  }, [isSplitScreen, commentLimit]);

  const handleLikeClick = () => {
    setLocalLiked(!localLiked);
    setLocalLikeCount((prev) => (localLiked ? prev - 1 : prev + 1));
    onToggleLike();
  };

  const handleSaveClick = () => {
    setLocalSaved(!localSaved);
    onToggleSave?.();
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    const newSpark: Spark = { id: Date.now(), x, y };
    setSparks((prev) => [...prev, newSpark]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
    }, 1000);

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (isDoubleTap) {
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
      if (!localLiked) {
        setLocalLiked(true);
        setLocalLikeCount((prev) => prev + 1);
        onToggleLike();
      }
    } else {
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        if (!isSplitScreen && !isSharePanelOpen) onClose();
      }, 300);
    }
  };

  const toggleCommentLike = async (commentId: string, hasLiked: boolean, _postId: string) => {
    if (!user) return;

    setComments(prev => {
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
      return updateTree(prev);
    });

    try {
      if (hasLiked) {
        await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_reactions").insert({ user_id: user.id, comment_id: commentId } as any);
      }
    } catch (e) {
      loadComments();
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    
    const parentId = replyingTo?.commentId || null;

    const { error } = await supabase
      .from("comments")
      .insert({ user_id: user.id, post_id: postId, content: newComment.trim(), parent_id: parentId } as any);

    if (error) {
      toast.error("Failed to post comment");
      return;
    }
    setNewComment("");
    setReplyingTo(null);
    setLocalCommentCount((prev) => prev + 1);
    onCommentAdded?.();
    loadComments();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col font-sans"
      style={{ opacity: dragOpacity }}
    >
      {/* ── TOP: IMAGE AREA ── */}
      <motion.div
        layout
        drag={!isSplitScreen && !isSharePanelOpen ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.7}
        style={{ y: dragY, scale: dragScale }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) {
            onClose();
          } else {
            dragY.set(0);
          }
        }}
        className={`relative flex items-center justify-center w-full overflow-hidden cursor-grab active:cursor-grabbing select-none [-webkit-tap-highlight-color:transparent] ${
          (isSplitScreen || isSharePanelOpen) ? "h-[45vh] bg-black border-b border-white/10" : "h-screen"
        }`}
        onClick={handleTap}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-[env(safe-area-inset-top,20px)] right-4 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Drag hint indicator */}
        {!isSplitScreen && (
          <div className="absolute top-[env(safe-area-inset-top,20px)] left-1/2 -translate-x-1/2 z-50">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
        )}

        <div className="w-full h-full relative overflow-hidden flex items-center justify-center p-4" onClick={handleTap}>
          <motion.img 
            ref={imgRef as unknown as React.Ref<HTMLImageElement>}
            layoutId={`post-img-${postId}`}
            src={displayImages[activeIndex]} 
            alt="Expanded" 
            drag
            dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
            dragElastic={0.4}
            className={cn(
              "max-w-full max-h-full object-contain pointer-events-auto transition-opacity duration-500 rounded-2xl",
              !imageLoaded ? "opacity-0" : "opacity-100"
            )} 
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* ── NEON SPARKS ── */}
        <AnimatePresence>
          {sparks.map((spark) => (
            <motion.div
              key={spark.id}
              initial={{ scale: 0, opacity: 1, y: 0, rotate: -20 }}
              animate={{
                scale: [0, 1.5, 1.2],
                opacity: [1, 1, 0],
                y: -60,
                rotate: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute pointer-events-none z-50 flex items-center justify-center"
              style={{ left: spark.x, top: spark.y, transform: "translate(-50%, -50%)" }}
            >
              <Heart className="h-24 w-24 fill-[hsl(var(--accent))] text-[hsl(var(--accent))] drop-shadow-[0_0_40px_hsl(var(--accent))]" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── BIG HEART ON DOUBLE TAP ── */}
        <AnimatePresence>
          {showBigHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 1.4, 1.2], opacity: [1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute pointer-events-none z-50 flex items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Heart className="h-32 w-32 fill-[hsl(var(--accent))] text-[hsl(var(--accent))] drop-shadow-[0_0_50px_hsl(var(--accent))]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Bar with MicroExpanders */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-full glass-panel border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MicroExpander
            text={localLikeCount > 0 ? `${localLikeCount}` : "Like"}
            icon={
              <Heart
                className={`h-5 w-5 transition-all duration-300 ${
                  localLiked
                    ? "fill-[hsl(var(--accent))] text-[hsl(var(--accent))] drop-shadow-[0_0_15px_hsl(var(--accent)/0.8)]"
                    : ""
                }`}
              />
            }
            variant="ghost"
            onClick={handleLikeClick}
            className={`h-10 ${localLiked ? "text-accent" : "text-white hover:text-accent"}`}
          />

          <div className="w-[1px] h-6 bg-white/20" />

          <MicroExpander
            text={localCommentCount > 0 ? `${localCommentCount}` : "Comment"}
            icon={
              <MessageCircle
                className={`h-5 w-5 ${isSplitScreen ? "fill-primary text-primary" : ""}`}
              />
            }
            variant="ghost"
            onClick={() => setIsSplitScreen(!isSplitScreen)}
            className={`h-10 ${
              isSplitScreen
                ? "text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]"
                : "text-white hover:text-primary"
            }`}
          />

          <div className="w-[1px] h-6 bg-white/20" />

            <MicroExpander
              text={localSaved ? "Saved" : "Save"}
              icon={
                <Bookmark
                  className={`h-5 w-5 transition-all duration-300 ${
                    localSaved ? "fill-current" : ""
                  }`}
                />
              }
              variant="ghost"
              onClick={handleSaveClick}
              className={`h-10 ${localSaved ? "text-foreground" : "text-white hover:text-foreground"}`}
            />

            <div className="w-[1px] h-6 bg-white/20" />

            <MicroExpander
              text="Share"
              icon={<Share className={`h-5 w-5 ${isSharePanelOpen ? "fill-primary text-primary" : ""}`} />}
              variant="ghost"
              onClick={handleShareClick}
              className={`h-10 ${
                isSharePanelOpen
                  ? "text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]"
                  : "text-white hover:text-primary"
              }`}
            />
          </div>
        </motion.div>

      {/* ── BOTTOM: COMMENT SPLIT ── */}
      <AnimatePresence>
        {isSplitScreen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                setIsSplitScreen(false);
              }
            }}
            className="flex-1 bg-gradient-to-b from-[hsl(var(--background))] to-black flex flex-col overflow-hidden relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
            
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-24">
              {loadingComments ? (
                <div className="flex flex-col gap-4 py-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-1/4" />
                        <div className="h-10 bg-white/10 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground/60 text-sm font-medium">
                    No comments yet. Start the conversation.
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={postId}
                    currentUserId={user?.id ?? null}
                    onReply={(commentId, displayName) => {
                      setReplyingTo({ commentId, displayName });
                    }}
                    onToggleLike={toggleCommentLike}
                  />
                ))
              )}
              
              {hasMoreComments && !loadingComments && (
                <div className="flex justify-center pt-2 pb-6">
                  <button
                    onClick={() => setCommentLimit(prev => prev + 30)}
                    className="text-sm font-medium text-primary bg-primary/10 px-4 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    Load More Comments
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-background/60 backdrop-blur-xl border-t border-white/5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
              {replyingTo && (
                <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-t-xl mb-[-4px] border-x border-t border-white/10 z-0 opacity-80 mx-auto max-w-lg">
                  <span className="text-[10px] text-muted-foreground">Replying to <span className="text-foreground font-semibold">@{replyingTo.displayName}</span></span>
                  <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-white transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className={`flex gap-2 max-w-lg mx-auto ${replyingTo ? "mt-0 z-10 relative" : ""}`}>
                <Input
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className={`h-11 bg-white/5 border border-white/10 text-sm pl-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50 ${replyingTo ? "rounded-b-xl rounded-t-none border-x border-b border-t-0" : "rounded-full"}`}
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim()}
                  className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30 disabled:bg-white/10 shrink-0 transition-transform active:scale-95 shadow-[0_0_15px_hsl(var(--primary)/0.4)] disabled:shadow-none"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM: SHARE PANEL SPLIT ── */}
      <AnimatePresence>
        {isSharePanelOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                setIsSharePanelOpen(false);
              }
            }}
            className="absolute bottom-0 left-0 w-full h-[55vh] bg-black/80 backdrop-blur-3xl border-t border-white/10 flex flex-col overflow-hidden z-[150] font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
            
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-3 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header / Search */}
            <div className="px-4 pb-2 shrink-0">
              <div className="relative group">
                <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative flex items-center glass-panel !bg-black/60 backdrop-blur-xl rounded-2xl h-12 px-4 overflow-hidden border border-white/10">
                  <Search className="h-4 w-4 text-muted-foreground mr-3" />
                  <input
                    type="text"
                    autoComplete="off"
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground/30 focus:ring-0 outline-none font-medium caret-primary"
                  />
                </div>
              </div>
            </div>

            {/* Grid of Users */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar relative">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-6 gap-x-2 pb-24">
                {filteredShareUsers.length === 0 ? (
                  <div className="col-span-4 sm:col-span-5 text-center text-muted-foreground/50 py-10 text-sm">
                    {shareSearchQuery ? "No users found" : "No recent chats"}
                  </div>
                ) : (
                  filteredShareUsers.map((u) => {
                    const isSelected = selectedUserIds.has(u.user_id);
                    return (
                      <div 
                        key={u.user_id} 
                        className="flex flex-col items-center gap-2 cursor-pointer relative group"
                        onClick={() => {
                          const newSet = new Set(selectedUserIds);
                          if (isSelected) newSet.delete(u.user_id);
                          else newSet.add(u.user_id);
                          setSelectedUserIds(newSet);
                        }}
                      >
                        <div className="relative">
                          <Avatar className={cn(
                            "h-14 w-14 ring-2 transition-all duration-300",
                            isSelected ? "ring-primary scale-110 shadow-[0_0_15px_hsl(var(--primary)/0.5)]" : "ring-transparent hover:ring-white/20 hover:scale-105",
                            getHaloClass(u.user_id)
                          )}>
                            <AvatarImage src={u.avatar_url || ""} />
                            <AvatarFallback>{u.display_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute -bottom-1 -right-1 bg-primary text-black rounded-full border-2 border-background z-10 p-0.5"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="text-[10px] text-center w-full truncate font-medium text-white/80 group-hover:text-white transition-colors">
                          {u.display_name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions Area (Sticky with fade) */}
            <div className="absolute bottom-0 left-0 w-full pt-12 pb-[env(safe-area-inset-bottom,20px)] px-4 bg-gradient-to-t from-black via-black/90 to-transparent">
              {selectedUserIds.size > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSendToSelected}
                    disabled={isSharing}
                    className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Send to {selectedUserIds.size} {selectedUserIds.size === 1 ? 'Person' : 'People'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleNativeShare}
                    className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/5"
                  >
                    <Share className="h-4 w-4" />
                    Share via...
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/5"
                  >
                    <Bookmark className="h-4 w-4" /> {/* Fallback icon, link/copy is not imported */}
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
