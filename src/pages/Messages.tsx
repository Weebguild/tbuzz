import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { DesktopChatLayout } from "@/components/chat/DesktopChatLayout";
import ChatRoom from "@/pages/ChatRoom";

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
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSplitLayout, setIsSplitLayout] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsSplitLayout(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  if (isSplitLayout) {
    return (
      <div className="h-[100dvh] w-full">
        <DesktopChatLayout />
      </div>
    );
  }

  if (conversationId) {
    return <ChatRoom inline />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl tracking-[0.2em] text-foreground uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-8 font-display"
      >
        Inbox
      </motion.h1>

      <AnimatePresence mode="popLayout">
        {conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-24 text-center rounded-3xl glass-panel relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-1/2" />
            <MessageSquare className="h-16 w-16 mx-auto text-primary/20 mb-6 animate-pulse" />
            <p className="text-xl text-foreground font-bold tracking-tight">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">
              Connect with mutual followers to start chatting
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.conversation_id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: i * 0.08,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                className="w-full text-left group"
              >
                <div className={cn(
                  "glass-card-modern",
                  conv.unread_count > 0 && "card-heat-medium"
                )}>
                  <div className="glass-card-inner !p-4 flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-white/10 group-hover:ring-primary/50 transition-all duration-300">
                        {conv.other_user.avatar_url ? (
                          <AvatarImage src={conv.other_user.avatar_url} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-white/5 text-lg font-bold text-foreground">
                            {conv.other_user.display_name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {conv.unread_count > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-[0_0_15px_rgba(124,58,237,0.8)]"
                        >
                          <span className="text-[10px] font-black text-white">{conv.unread_count}</span>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-base font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {conv.other_user.display_name}
                        </p>
                        {conv.last_message_at && (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold shrink-0">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          conv.unread_count > 0 ? "text-foreground font-semibold" : "text-muted-foreground font-medium"
                        )}>
                          {conv.last_message || "Start the conversation..."}
                        </p>
                        {conv.unread_count > 0 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
