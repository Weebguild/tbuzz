import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface ConversationItem {
  conversation_id: string;
  updated_at: string;
  other_user: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      // Get all conversations this user is part of
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

      // Get conversation details
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (!convs || convs.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id);

      const otherUserIds = [...new Set(allParticipants?.map((p) => p.user_id) ?? [])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherUserIds);

      // Get last message for each conversation
      const items: ConversationItem[] = [];
      for (const conv of convs) {
        const otherParticipant = allParticipants?.find((p) => p.conversation_id === conv.id);
        const otherProfile = profiles?.find((p) => p.user_id === otherParticipant?.user_id);

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        if (otherProfile) {
          items.push({
            conversation_id: conv.id,
            updated_at: conv.updated_at,
            other_user: otherProfile,
            last_message: lastMsg?.content ?? null,
            last_message_at: lastMsg?.created_at ?? null,
            unread_count: unreadCount ?? 0,
          });
        }
      }

      setConversations(items);
      setLoading(false);
    };

    fetchConversations();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-4xl tracking-widest text-foreground uppercase drop-shadow-md mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="py-20 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Follow someone and have them follow you back to start messaging
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv, i) => (
            <motion.button
              key={conv.conversation_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/messages/${conv.conversation_id}`)}
              className="flex items-center gap-3 w-full p-4 rounded-2xl glass-panel hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-white/10">
                  {conv.other_user.avatar_url ? (
                    <AvatarImage src={conv.other_user.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted text-sm font-bold text-foreground">
                      {conv.other_user.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {conv.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{conv.unread_count}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground truncate">{conv.other_user.display_name}</p>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
