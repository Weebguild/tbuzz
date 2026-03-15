import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  parent_id?: string | null;
  reaction_count?: number;
  has_liked?: boolean;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUserId: string | null;
  onReply: (commentId: string, displayName: string) => void;
  onToggleLike: (commentId: string, hasLiked: boolean, postId: string) => void;
  level?: number;
}

export const CommentItem = ({
  comment,
  postId,
  currentUserId,
  onReply,
  onToggleLike,
  level = 0
}: CommentItemProps) => {
  return (
    <div className={`flex gap-2.5 ${level > 0 ? "ml-6 mt-3" : "mt-3"}`}>
      <div className="shrink-0 mt-0.5">
        <Avatar className="h-6 w-6 ring-1 ring-white/10">
          {comment.avatar_url ? (
            <AvatarImage src={comment.avatar_url} />
          ) : (
            <AvatarFallback className="bg-black/40 text-[10px] font-bold text-foreground">
              {comment.display_name.charAt(0)}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <UserHoverCard userId={comment.user_id}>
            <span className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate cursor-pointer">
              {comment.display_name}
            </span>
          </UserHoverCard>
          <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/80 mt-0.5 whitespace-pre-wrap">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-1.5">
          <button
            onClick={() => onToggleLike(comment.id, comment.has_liked ?? false, postId)}
            className={`flex items-center gap-1 text-[10px] transition-colors ${comment.has_liked ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className={`h-3 w-3 ${comment.has_liked ? "fill-current" : ""}`} />
            {((comment.reaction_count ?? 0) > 0) && <span className="font-medium">{comment.reaction_count}</span>}
          </button>
          <button
            onClick={() => onReply(comment.id, comment.display_name)}
            className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reply
          </button>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 border-l border-white/5 pl-2 relative">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUserId={currentUserId}
                onReply={onReply}
                onToggleLike={onToggleLike}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
