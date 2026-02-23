import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// Type for our temporary neon sparks
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
  reactionCount: number;
  commentCount: number;
  onClose: () => void;
  onToggleLike: () => void;
}

export function PostImageExpander({
  postId,
  imageUrl,
  hasLiked,
  reactionCount,
  commentCount,
  onClose,
  onToggleLike,
}: PostImageExpanderProps) {
  const { user } = useAuth();
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Spark state for the double-tap animation
  const [sparks, setSparks] = useState<Spark[]>([]);

  // Optimistic UI state
  const [localLiked, setLocalLiked] = useState(hasLiked);
  const [localLikeCount, setLocalLikeCount] = useState(reactionCount);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

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
    if (isSplitScreen) {
      fetchComments();
    }
  }, [isSplitScreen]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalLiked(!localLiked);
    setLocalLikeCount((prev) => (localLiked ? prev - 1 : prev + 1));
    onToggleLike();
  };

  // ── THE DOUBLE TAP LOGIC ──
  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    // 1. Get exact tap coordinates relative to the image container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSpark: Spark = { id: Date.now(), x, y };
    setSparks((prev) => [...prev, newSpark]);

    // 2. Only trigger the like if they haven't liked it yet (Instagram rules: double tap never un-likes)
    if (!localLiked) {
      setLocalLiked(true);
      setLocalLikeCount((prev) => prev + 1);
      onToggleLike();
    }

    // 3. Remove the spark from the DOM after the animation completes
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
    }, 1000);
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
    >
      {/* ── TOP: IMAGE AREA ── */}
      <motion.div
        layout
        className={`relative flex items-center justify-center w-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden cursor-pointer ${
          isSplitScreen ? "h-[45vh] bg-black border-b border-white/10" : "h-screen"
        }`}
        onClick={() => !isSplitScreen && onClose()}
        onDoubleClick={handleDoubleTap} // Attach the gesture here!
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

        <motion.img
          layout
          src={imageUrl}
          alt="Expanded"
          className="w-full h-full object-contain pointer-events-none" // pointer-events-none ensures the div catches the double tap
        />

        {/* ── THE NEON SPARKS OVERLAY ── */}
        <AnimatePresence>
          {sparks.map((spark) => (
            <motion.div
              key={spark.id}
              initial={{ scale: 0, opacity: 1, y: 0, rotate: -20 }}
              animate={{
                scale: [0, 1.5, 1.2], // Pops huge, then settles slightly
                opacity: [1, 1, 0], // Fades out at the very end
                y: -60, // Floats upwards like a bubble
                rotate: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute pointer-events-none z-50 flex items-center justify-center"
              style={{ left: spark.x, top: spark.y, transform: "translate(-50%, -50%)" }}
            >
              <Heart className="h-24 w-24 fill-[#EC4899] text-[#EC4899] drop-shadow-[0_0_40px_rgba(236,72,153,1)]" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating Action Bar */}
        <motion.div
          layout
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-full glass-panel border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleLikeClick} className="flex items-center gap-2 text-white group">
            <Heart
              className={`h-6 w-6 transition-all duration-300 ${localLiked ? "fill-[#EC4899] text-[#EC4899] drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] scale-110" : "group-hover:text-[#EC4899]"}`}
            />
            {localLikeCount > 0 && <span className="text-sm font-bold">{localLikeCount}</span>}
          </button>

          <div className="w-[1px] h-6 bg-white/20" />

          <button
            onClick={() => setIsSplitScreen(!isSplitScreen)}
            className={`flex items-center gap-2 transition-colors ${isSplitScreen ? "text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.8)]" : "text-white hover:text-primary"}`}
          >
            <MessageCircle className={`h-6 w-6 ${isSplitScreen ? "fill-primary" : ""}`} />
            {localCommentCount > 0 && <span className="text-sm font-bold">{localCommentCount}</span>}
          </button>
        </motion.div>
      </motion.div>

      {/* ── BOTTOM: EDITORIAL COMMENT SPLIT (Unchanged) ── */}
      <AnimatePresence>
        {isSplitScreen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-1 bg-gradient-to-b from-[#0A0A0A] to-black flex flex-col overflow-hidden relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_rgba(124,58,237,0.5)]" />

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
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 shrink-0">
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
                        <span className="text-sm font-bold text-white tracking-wide">{c.display_name}</span>
                        <span className="text-[10px] text-white/40">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
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
                  className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-30 disabled:bg-white/10 shrink-0 transition-transform active:scale-95 shadow-[0_0_15px_rgba(124,58,237,0.4)] disabled:shadow-none"
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
