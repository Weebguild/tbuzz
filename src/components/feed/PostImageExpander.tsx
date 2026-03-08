import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { X, Heart, MessageCircle, Send, Loader2, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MicroExpander } from "@/components/ui/micro-expander";

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PostImageExpanderProps {
  postId: string;
  imageUrl: string;
  hasLiked: boolean;
  hasSaved?: boolean;
  reactionCount: number;
  commentCount: number;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleSave?: () => void;
}

export function PostImageExpander({
  postId,
  imageUrl,
  hasLiked,
  hasSaved = false,
  reactionCount,
  commentCount,
  onClose,
  onToggleLike,
  onToggleSave,
}: PostImageExpanderProps) {
  const { getHaloClass } = useHalo();
  const { user } = useAuth();
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sparks, setSparks] = useState<Spark[]>([]);
  const tapTimer = useRef<number | null>(null);

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

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      const uids = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids);

      const enriched = data.map((c) => {
        const p = profiles?.find((pr) => pr.user_id === c.user_id);
        return { ...c, display_name: p?.display_name ?? "Unknown", avatar_url: p?.avatar_url ?? null };
      });
      setComments(enriched);
    }
    setLoadingComments(false);
  };

  useEffect(() => {
    if (isSplitScreen) fetchComments();
  }, [isSplitScreen]);

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
      const newSpark: Spark = { id: Date.now(), x, y };
      setSparks((prev) => [...prev, newSpark]);
      if (!localLiked) {
        setLocalLiked(true);
        setLocalLikeCount((prev) => prev + 1);
        onToggleLike();
      }
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
      }, 1000);
    } else {
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        if (!isSplitScreen) onClose();
      }, 250);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase
      .from("comments")
      .insert({ user_id: user.id, post_id: postId, content: newComment.trim() });

    if (error) {
      toast.error("Failed to post comment");
      return;
    }
    setNewComment("");
    setLocalCommentCount((prev) => prev + 1);
    fetchComments();
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
        drag={!isSplitScreen ? "y" : false}
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
        className={`relative flex items-center justify-center w-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden cursor-grab active:cursor-grabbing select-none [-webkit-tap-highlight-color:transparent] ${
          isSplitScreen ? "h-[45vh] bg-black border-b border-white/10" : "h-screen"
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

        <motion.img layout src={imageUrl} alt="Expanded" className="w-full h-full object-contain pointer-events-none" />

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

        {/* Floating Action Bar with MicroExpanders */}
        <motion.div
          layout
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full glass-panel border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50"
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
        </motion.div>
      </motion.div>

      {/* ── BOTTOM: COMMENT SPLIT ── */}
      <AnimatePresence>
        {isSplitScreen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-1 bg-gradient-to-b from-[hsl(var(--background))] to-black flex flex-col overflow-hidden relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 no-scrollbar pb-24">
              {loadingComments ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground/60 text-sm font-medium">
                    No comments yet. Start the conversation.
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className={cn("h-8 w-8 shrink-0", getHaloClass(c.user_id))}>
                      {c.avatar_url ? (
                        <AvatarImage src={c.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                          {c.display_name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-bold text-foreground tracking-wide">{c.display_name}</span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-background/60 backdrop-blur-xl border-t border-white/5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
              <div className="flex gap-2 max-w-lg mx-auto">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className="h-11 rounded-full bg-white/5 border border-white/10 text-sm pl-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
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
    </motion.div>
  );
}
