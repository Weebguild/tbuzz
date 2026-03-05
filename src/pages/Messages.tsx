import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ArrowRight, Search, Pin, Star, Plus, MoreHorizontal, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ChatRoom from "@/pages/ChatRoom";
import { Input } from "@/components/ui/input";
import { UserSearch } from "@/components/UserSearch";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

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

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

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

      const items: ConversationItem[] = [];
      for (const conv of convs) {
        const otherParticipant = allParticipants?.find((p) => p.conversation_id === conv.id);
        const otherProfile = profiles?.find((p) => p.user_id === otherParticipant?.user_id);

        if (!otherProfile) continue;

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

        items.push({
          conversation_id: conv.id,
          updated_at: conv.updated_at,
          other_user: otherProfile,
          last_message: lastMsg?.content ? (
            lastMsg.content.startsWith("{") ? "Media Message" : lastMsg.content
          ) : null,
          last_message_at: lastMsg?.created_at ?? null,
          unread_count: unreadCount ?? 0,
        });
      }

      setConversations(items);
      setLoading(false);
    };

    fetchConversations();

    // Set up realtime subscription for messages to update unread counts and last messages
    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c =>
      c.other_user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [conversations, searchQuery]);

  const pinnedConversations = useMemo(() =>
    filteredConversations.filter(c => pinnedIds.includes(c.conversation_id)),
    [filteredConversations, pinnedIds]);

  const otherConversations = useMemo(() =>
    filteredConversations.filter(c => !pinnedIds.includes(c.conversation_id)),
    [filteredConversations, pinnedIds]);

  if (conversationId) {
    return <ChatRoom />;
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0A0A0A]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-widest uppercase opacity-40"
          >
            TBuzz
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 pb-24">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-xl mx-auto px-6 pt-12 relative z-10">
        {/* Flagship Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black tracking-tighter uppercase leading-none"
            >
              Messages
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="text-[10px] font-bold tracking-[0.4em] uppercase mt-2 ml-1"
            >
              Secure Communication
            </motion.p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearchModal(true)}
            className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl shadow-primary/20"
          >
            <Plus className="h-7 w-7 stroke-[2.5px]" />
          </motion.button>
        </div>

        {/* Search Experience */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
          <div className="relative flex items-center bg-[#111] border border-white/5 rounded-2xl h-16 px-6 overflow-hidden">
            <Search className="h-5 w-5 text-muted-foreground mr-4" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent border-none text-base placeholder:text-muted-foreground/30 focus:ring-0 outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-black uppercase text-primary tracking-tighter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Pinned / Favorites Section */}
        {pinnedConversations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6 ml-1">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pinned Chats</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {pinnedConversations.map((conv) => (
                <motion.button
                  key={conv.conversation_id}
                  layoutId={`pinned-${conv.conversation_id}`}
                  onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                  className="flex flex-col items-center gap-3 shrink-0 group relative"
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-full blur-sm opacity-0 group-hover:opacity-40 transition duration-300" />
                    <Avatar className="h-20 w-20 ring-4 ring-[#050505] shadow-2xl relative">
                      <AvatarImage src={conv.other_user.avatar_url || ""} />
                      <AvatarFallback className="bg-[#111] text-xl font-black">{conv.other_user.display_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary border-4 border-[#050505] flex items-center justify-center">
                        <span className="text-[9px] font-black">{conv.unread_count}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold tracking-tight opacity-60 group-hover:opacity-100 transition-opacity truncate max-w-[80px]">
                    {conv.other_user.display_name.split(' ')[0]}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Recents</h2>
            <Filter className="h-3 w-3 text-white/20" />
          </div>

          <AnimatePresence mode="popLayout">
            {filteredConversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="h-24 w-24 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-white/10" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white/40">Quiet here...</h3>
                <p className="text-xs text-white/20 mt-2 max-w-[200px] mx-auto">Start a new encrypted chat with a mutual follower.</p>
              </motion.div>
            ) : (
              otherConversations.map((conv, i) => (
                <motion.button
                  key={conv.conversation_id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                  className="w-full text-left p-5 rounded-3xl bg-[#0F0F0F]/50 border border-white/[0.03] transition-all flex items-center gap-5 relative group overflow-hidden"
                >
                  {/* Hover Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 ring-1 ring-white/10">
                      <AvatarImage src={conv.other_user.avatar_url || ""} />
                      <AvatarFallback className="bg-[#111] text-lg font-bold">{conv.other_user.display_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success border-[3px] border-[#0F0F0F]" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors truncate">
                        {conv.other_user.display_name}
                      </h3>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                        {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at)) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className={cn(
                        "text-sm truncate",
                        conv.unread_count > 0 ? "text-white font-bold" : "text-white/40 font-medium"
                      )}>
                        {conv.last_message || "Initialize protocol..."}
                      </p>
                      {conv.unread_count > 0 && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/50">
                          <span className="text-[10px] font-black uppercase tracking-tighter">{conv.unread_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Swipe Action or context hint */}
                  <button
                    onClick={(e) => togglePin(e, conv.conversation_id)}
                    className="absolute right-[-40px] group-hover:right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/5 transition-all text-white/10 hover:text-white"
                  >
                    <Pin className={cn("h-4 w-4", pinnedIds.includes(conv.conversation_id) && "fill-current text-primary")} />
                  </button>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Discovery Sheet Integration */}
      <AnimatePresence>
        {showSearchModal && (
          <UserSearch onClose={() => setShowSearchModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
