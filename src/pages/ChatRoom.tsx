import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sendMessage, markAsRead } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Recipient info
  const [recipient, setRecipient] = useState<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    const fetchRecipient = async () => {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);

      if (participants && participants.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .eq("user_id", participants[0].user_id)
          .single();
        if (profile) setRecipient(profile);
      }
    };
    fetchRecipient();
  }, [conversationId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await sendMessage(input);
    setInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-4 border-b border-white/5 glass-panel z-20"
      >
        <button
          onClick={() => navigate("/messages")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {recipient && (
          <button
            onClick={() => navigate(`/profile/${recipient.user_id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-white/10 group-hover:ring-primary/50 transition-all duration-300">
                {recipient.avatar_url ? (
                  <AvatarImage src={recipient.avatar_url} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-white/5 text-xs font-black text-foreground">
                    {recipient.display_name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-[#0A0A0A]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-foreground tracking-tight">{recipient.display_name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Active now</p>
            </div>
          </button>
        )}
      </motion.div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/2 blur-[120px] pointer-events-none" />
        <ScrollArea className="h-full px-4 py-6">
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20"
                >
                  <p className="text-xl font-black text-muted-foreground/20 uppercase tracking-widest">Beginning of transmissions</p>
                  <p className="text-xs text-muted-foreground/40 mt-2">Say hello to start the flow 👋</p>
                </motion.div>
              )}
              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20
                    }}
                    className={cn(
                      "flex items-end gap-2",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOwn && (
                      <div className="w-8 shrink-0">
                        {showAvatar && recipient && (
                          <Avatar className="h-8 w-8 ring-1 ring-white/5">
                            {recipient.avatar_url ? (
                              <AvatarImage src={recipient.avatar_url} />
                            ) : (
                              <AvatarFallback className="text-[10px] font-bold">
                                {recipient.display_name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "max-w-[80%] flex flex-col",
                      isOwn ? "items-end" : "items-start"
                    )}>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed relative group",
                          isOwn
                            ? "bg-gradient-to-br from-primary to-accent text-white rounded-br-none shadow-[0_8px_20px_rgba(124,58,237,0.3)]"
                            : "bg-white/5 border border-white/10 text-foreground rounded-bl-none backdrop-blur-md"
                        )}
                      >
                        <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] mt-1 font-bold uppercase tracking-widest",
                        isOwn ? "text-primary/60" : "text-muted-foreground/60"
                      )}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={bottomRef} className="h-4" />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 border-t border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <Input
              placeholder="Type a transmission..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="relative flex-1 bg-[#141414] border-white/5 rounded-2xl h-14 px-6 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all duration-300"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_25px_rgba(124,58,237,0.4)] disabled:opacity-40 disabled:shadow-none transition-all active:shadow-inner overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
