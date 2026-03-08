import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2, ArrowRight, Search, Pin, Star,
  Plus, MoreHorizontal, Filter, Mail,
  ChevronRight, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ChatRoom from "@/pages/ChatRoom";
import { Input } from "@/components/ui/input";
import { UserSearch } from "@/components/UserSearch";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PostSkeleton } from "@/components/ui/PostSkeleton";

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
  isTyping?: boolean;
}

export default function Messages() {
  const { user } = useAuth();
  const { getHaloClass } = useHalo();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const isMobile = useIsMobile();

  // Load pins from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pinned_chats");
    if (saved) setPinnedIds(JSON.parse(saved));
  }, []);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newPinned = pinnedIds.includes(id)
      ? pinnedIds.filter(p => p !== id)
      : [id, ...pinnedIds];
    setPinnedIds(newPinned);
    localStorage.setItem("pinned_chats", JSON.stringify(newPinned));
  };

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map(p => p.conversation_id);

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id);

      const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) ?? [])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherUserIds);

      // Batch: fetch last messages and unread counts for ALL conversations at once
      const [{ data: allMessages }, { data: unreadMessages }] = await Promise.all([
        supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .eq("is_read", false),
      ]);

      // Group last message per conversation (first occurrence = latest due to order)
      const lastMsgMap = new Map<string, { content: string; created_at: string }>();
      for (const msg of allMessages ?? []) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, { content: msg.content, created_at: msg.created_at });
        }
      }

      // Count unreads per conversation
      const unreadCountMap = new Map<string, number>();
      for (const msg of unreadMessages ?? []) {
        unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) ?? 0) + 1);
      }

      const items: ConversationItem[] = [];
      for (const conv of convs || []) {
        const otherParticipant = allParticipants?.find(p => p.conversation_id === conv.id);
        const otherProfile = profiles?.find(p => p.user_id === otherParticipant?.user_id);
        if (!otherProfile) continue;

        const lastMsg = lastMsgMap.get(conv.id);
        items.push({
          conversation_id: conv.id,
          updated_at: conv.updated_at,
          other_user: otherProfile,
          last_message: lastMsg?.content ? (
            lastMsg.content.startsWith("{") ? "Media Message" : lastMsg.content
          ) : "No messages yet",
          last_message_at: lastMsg?.created_at ?? null,
          unread_count: unreadCountMap.get(conv.id) ?? 0,
        });
      }

      setConversations(items);
      setLoading(false);
    };

    fetchConversations();

    // Fetch conversation IDs for typing subscriptions
    const setupTypingChannels = async () => {
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const channels = (parts ?? []).map(p =>
        supabase
          .channel(`typing-inbox:${p.conversation_id}`)
          .on("broadcast", { event: "typing" }, (payload) => {
            if (payload.payload.userId !== user.id) {
              setConversations(prev => prev.map(c =>
                c.conversation_id === p.conversation_id
                  ? { ...c, isTyping: payload.payload.isTyping }
                  : c
              ));
            }
          })
          .subscribe()
      );
      return channels;
    };

    let typingChannels: ReturnType<typeof supabase.channel>[] = [];
    setupTypingChannels().then(ch => { typingChannels = ch; });

    let debounceTimer: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchConversations, 500);
    };

    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
      typingChannels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user]);

  const filteredConversations = useMemo(() => {
    const blockedUsers = JSON.parse(localStorage.getItem("blocked_users") || "[]");
    return conversations.filter(c => {
      const isBlocked = blockedUsers.includes(c.other_user.user_id);
      if (isBlocked) return false;

      return (c.other_user.display_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery]);

  const pinnedConversations = useMemo(() =>
    filteredConversations.filter(c => pinnedIds.includes(c.conversation_id)),
    [filteredConversations, pinnedIds]);

  const otherConversations = useMemo(() =>
    filteredConversations.filter(c => !pinnedIds.includes(c.conversation_id)),
    [filteredConversations, pinnedIds]);

  if (isMobile && conversationId) {
    return <ChatRoom />;
  }

  if (loading) {
    return (
      <div className={cn("flex text-foreground", isMobile ? "flex-col min-h-full" : "h-full flex-row overflow-hidden")}>
        <div className={cn(
          "flex flex-col shrink-0 min-h-0",
          isMobile ? "w-full" : "w-[360px] border-r border-white/[0.08]"
        )}>
          <div className="px-4 pt-6 pb-4 space-y-6">
            <div className="space-y-3">
              <div className="h-10 w-40 bg-muted/30 rounded-2xl animate-skeleton-pulse" />
              <div className="h-3 w-28 bg-muted/20 rounded-full animate-skeleton-pulse" />
            </div>
            <div className="h-12 w-full glass-panel rounded-2xl animate-skeleton-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="glass-panel rounded-3xl p-4">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted/20 animate-skeleton-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted/20 rounded animate-skeleton-pulse" />
                      <div className="h-3 w-full bg-muted/10 rounded animate-skeleton-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {!isMobile && (
          <div className="flex-1 flex items-center justify-center">
            <div className="glass-panel rounded-3xl p-12 flex flex-col items-center">
              <Mail className="h-20 w-20 stroke-[0.5px] text-muted-foreground animate-pulse" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "text-foreground selection:bg-primary/30 flex",
      isMobile ? "flex-col min-h-full" : "h-full flex-row overflow-hidden"
    )}>

      {/* Conversation List Column */}
      <div className={cn(
        "flex flex-col shrink-0 min-h-0 relative z-10",
        isMobile ? "w-full h-full" : "w-[360px] border-r border-white/[0.08]"
      )}>

        <div className={cn("px-4 pt-6", isMobile ? "" : "pb-4")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-black tracking-widest uppercase leading-none drop-shadow-md"
              >
                Messages
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-[10px] font-bold tracking-[0.4em] uppercase mt-2 ml-1 text-muted-foreground"
              >
                Chat & Connect
              </motion.p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSearchModal(true)}
              className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
            >
              <Plus className="h-5 w-5 stroke-[2.5px]" />
            </motion.button>
          </div>

          <div className="relative mb-6 group">
            <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative flex items-center glass-panel rounded-2xl h-12 px-4 overflow-hidden">
              <Search className="h-4 w-4 text-muted-foreground mr-3" />
              <input
                type="text"
                autoComplete="off"
                value={searchQuery}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search..."
                className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground/30 focus:ring-0 outline-none font-medium caret-primary"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-20">
            {pinnedConversations.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4 ml-2 pb-2 border-b border-white/[0.05]">
                  <Star className="h-3 w-3 text-primary fill-primary" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Pinned</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {pinnedConversations.map((conv) => (
                    <motion.button
                      key={conv.conversation_id}
                      onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                      className="flex flex-col items-center gap-3 shrink-0 group relative"
                    >
                      <div className="relative group/avatar">
                        <Avatar className={cn(
                          "h-16 w-16 ring-4 transition-all",
                          conversationId === conv.conversation_id ? "ring-primary shadow-xl scale-105" : "ring-primary/30 group-hover/avatar:ring-primary/50"
                        )}>
                          <AvatarImage src={conv.other_user.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-lg font-black">{conv.other_user.display_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <button
                          onClick={(e) => togglePin(e, conv.conversation_id)}
                          className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="h-3 w-3 stroke-[3px]" />
                        </button>
                      </div>
                      <span className="text-[10px] font-bold tracking-tight opacity-40 group-hover:opacity-100 transition-opacity truncate max-w-[60px]">
                        {conv.other_user.display_name.split(' ')[0]}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4 px-2 pb-2 border-b border-white/[0.05]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Recent Messages</h2>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="space-y-3">
                {otherConversations.map((conv) => (
                  <motion.button
                    key={conv.conversation_id}
                    onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                    className={cn(
                      "w-full text-left p-4 rounded-3xl transition-all flex items-center gap-4 relative group overflow-hidden",
                      conversationId === conv.conversation_id
                        ? "glass-panel border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                        : "glass-panel border-transparent hover:border-primary/20 hover:shadow-[0_0_15px_hsl(var(--primary)/0.05)]"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.other_user.avatar_url || ""} />
                        <AvatarFallback className="bg-muted text-base font-bold">{conv.other_user.display_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {conv.unread_count > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background">
                          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-25" />
                          <div className="absolute inset-0 bg-primary rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-sm truncate">{conv.other_user.display_name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">
                          {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {conv.unread_count > 0 && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
                          )}
                          <p className={cn("text-xs flex-1 w-0 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap", conv.unread_count > 0 ? "text-primary font-black" : "text-muted-foreground/60")}>
                            {conv.isTyping ? (
                              <span className="text-primary font-bold italic flex items-center gap-1">
                                typing
                                <span className="inline-flex gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                  <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                  <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                                </span>
                              </span>
                            ) : (conv.last_message || "No messages yet")}
                          </p>
                        </div>
                        <button
                          onClick={(e) => togglePin(e, conv.conversation_id)}
                          className="p-2 rounded-xl bg-muted/20 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Pin className={cn("h-3.5 w-3.5", pinnedIds.includes(conv.conversation_id) && "fill-current text-primary")} />
                        </button>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Column */}
      {!isMobile && (
        <div className="flex-1 flex flex-col relative min-w-0 shadow-[inset_1px_0_0_rgba(255,255,255,0.03)]">
          {conversationId ? (
            <ChatRoom desktop={true} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="glass-panel rounded-3xl p-12 flex flex-col items-center">
                <Mail className="h-20 w-20 mb-6 stroke-[0.5px] text-muted-foreground/40" />
                <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-muted-foreground/60">Select a Chat</h2>
                <p className="text-xs uppercase tracking-widest mt-4 text-muted-foreground/40">Pick a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discovery Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <UserSearch onClose={() => setShowSearchModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
