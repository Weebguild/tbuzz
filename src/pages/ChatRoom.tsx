import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sendMessage, markAsRead, isTyping, handleInputChange } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Gesture handling
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [0, 1]);
  const scale = useTransform(x, [-100, 0], [0.95, 1]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      navigate("/messages");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-b-2 border-accent animate-spin-reverse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0A] text-foreground"
    >
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-2xl z-20"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/messages")}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white border border-white/5"
          >
            <X className="h-5 w-5" />
          </button>
          {recipient && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  {recipient.avatar_url ? (
                    <AvatarImage src={recipient.avatar_url} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-black">
                      {recipient.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-[#0A0A0A]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight">{recipient.display_name}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                  {isTyping ? "Transmitting..." : "Synchronized"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.05)_0%,transparent_100%)]">
        <ScrollArea className="h-full px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                    <Send className="h-8 w-8 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white/80">Establish Link</h3>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[200px] leading-relaxed">Encrypted end-to-end transmission authorized.</p>
                </motion.div>
              )}

              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
                const isLastInGroup = idx === messages.length - 1 || messages[idx + 1].sender_id !== msg.sender_id;

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn(
                      "flex items-end gap-3",
                      isOwn ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isOwn && (
                      <div className="w-8 shrink-0 mb-1">
                        {showAvatar && recipient && (
                          <Avatar className="h-8 w-8 ring-1 ring-white/10 shadow-lg">
                            {recipient.avatar_url ? (
                              <AvatarImage src={recipient.avatar_url} />
                            ) : (
                              <AvatarFallback className="text-[10px] font-bold bg-white/5">
                                {recipient.display_name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "flex flex-col gap-1",
                      isOwn ? "items-end" : "items-start",
                      "max-w-[75%]"
                    )}>
                      <div
                        className={cn(
                          "px-5 py-3.5 rounded-[22px] text-sm relative transition-all duration-300",
                          isOwn
                            ? "bg-gradient-to-br from-primary to-accent text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] border border-white/10"
                            : "bg-white/5 border border-white/10 text-foreground backdrop-blur-xl shadow-xl",
                          isOwn && isLastInGroup ? "rounded-br-none" : "",
                          !isOwn && isLastInGroup ? "rounded-bl-none" : ""
                        )}
                      >
                        <p className="leading-relaxed font-medium selection:bg-white/30">{msg.content}</p>
                      </div>

                      {isLastInGroup && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-1",
                          isOwn ? "flex-row-reverse" : "flex-row"
                        )}>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                          </span>
                          {isOwn && (
                            <div className="flex items-center">
                              {msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-primary animate-in fade-in zoom-in duration-500" />
                              ) : (
                                <Check className="h-3 w-3 text-muted-foreground/30" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 shrink-0">
                    <Avatar className="h-8 w-8 ring-1 ring-white/10 bg-white/5 opacity-50">
                      <AvatarFallback className="text-[10px] font-bold">...</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="bg-white/5 border border-white/5 backdrop-blur-md px-4 py-3 rounded-full flex gap-1.5 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} className="h-12" />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="p-6 pb-8 border-t border-white/5 bg-[#0A0A0A]/80 backdrop-blur-3xl"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1 relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur-sm" />
            <Input
              placeholder="Start transmission..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleInputChange();
              }}
              onKeyDown={handleKeyDown}
              className="relative flex-1 bg-[#121212] border-white/5 rounded-2xl h-14 px-6 text-sm text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 focus-visible:border-primary/20 transition-all duration-300 shadow-inner"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)] disabled:opacity-30 disabled:grayscale transition-all"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Side Hint for Drag */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-r-full pointer-events-none opacity-50" />
    </motion.div>
  );
}
