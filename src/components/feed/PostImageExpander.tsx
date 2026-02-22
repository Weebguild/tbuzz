import { Heart, MessageCircle, X } from "lucide-react";
import { motion } from "framer-motion";

interface PostImageExpanderProps {
  imageUrl: string;
  hasLiked: boolean;
  reactionCount: number;
  commentCount: number;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleComments: () => void;
}

export function PostImageExpander({
  imageUrl,
  hasLiked,
  reactionCount,
  commentCount,
  onClose,
  onToggleLike,
  onToggleComments,
}: PostImageExpanderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative z-10 max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt="Post"
          className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 rounded-full px-6 py-3">
          <button
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 text-sm ${hasLiked ? "text-primary" : "text-white"}`}
          >
            <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
            {reactionCount > 0 && <span className="text-xs font-medium">{reactionCount}</span>}
          </button>
          <button
            onClick={onToggleComments}
            className="flex items-center gap-1.5 text-sm text-white"
          >
            <MessageCircle className="h-5 w-5" />
            {commentCount > 0 && <span className="text-xs font-medium">{commentCount}</span>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
