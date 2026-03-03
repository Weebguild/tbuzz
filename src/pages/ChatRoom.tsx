import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2, Check, CheckCheck, Plus, Mic, Play, Pause, Image as ImageIcon, Video as VideoIcon, Trash2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ChatRoom({ desktop = false, inline = false }: { desktop?: boolean; inline?: boolean }) {
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

  // Media state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [attachment, setAttachment] = useState<{ file: File; type: "image" | "video" | "audio"; preview: string } | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
  }, [messages, isTyping, attachment, isRecording]);

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      if (attachment) {
        await sendMessage(input, attachment.file, attachment.type);
      } else {
        await sendMessage(input);
      }
      setInput("");
      setAttachment(null);
    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      navigate("/messages");
    }
  };

  // Voice Recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder?.stop(); // Ensure previous is stopped

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setAttachment({
          file,
          type: "audio",
          preview: URL.createObjectURL(audioBlob),
        });
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
      if (!type) {
        toast.error("Unsupported file type");
        return;
      }
      setAttachment({
        file,
        type,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const toggleAudioPlayback = (msgId: string, url: string) => {
    const current = audioRefs.current[msgId];
    if (playingAudioId === msgId && current) {
      current.pause();
      setPlayingAudioId(null);
      return;
    }
    // Pause any other playing audio
    if (playingAudioId && audioRefs.current[playingAudioId]) {
      audioRefs.current[playingAudioId].pause();
    }
    if (!current) {
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audioRefs.current[msgId] = audio;
      audio.play();
    } else {
      current.play();
    }
    setPlayingAudioId(msgId);
  };

  const parseMessageContent = (content: string) => {
    try {
      if (content.startsWith("{") && content.endsWith("}")) {
        return JSON.parse(content);
      }
    } catch (e) { }
    return { type: "text", content };
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
      style={(desktop || inline) ? {} : { x, opacity, scale }}
      drag={(desktop || inline) ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex flex-col bg-[#0A0A0A] text-foreground",
        desktop ? "h-full w-full" : inline ? "h-[100dvh] w-full" : "fixed inset-0 z-50"
      )}
    >
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-2xl z-20 shrink-0",
          desktop && "py-6 px-10"
        )}
      >
        <div className="flex items-center gap-4">
          {!desktop && (
            <button
              onClick={() => navigate("/messages")}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white border border-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {recipient && (
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className={cn("ring-2 ring-primary/20", desktop ? "h-14 w-14" : "h-10 w-10")}>
                  {recipient.avatar_url ? (
                    <AvatarImage src={recipient.avatar_url} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-black">
                      {recipient.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className={cn("absolute bg-success rounded-full border-2 border-[#0A0A0A]", desktop ? "h-4 w-4 -bottom-1 -right-1" : "h-3 w-3 -bottom-0.5 -right-0.5")} />
              </div>
              <div className="flex flex-col">
                <span className={cn("font-black tracking-tight", desktop ? "text-xl" : "text-sm")}>{recipient.display_name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                    {isTyping ? "Typing..." : "Online"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex -space-x-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 relative min-h-0 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08)_0%,transparent_50%)]">
        <ScrollArea className="h-full px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="h-20 w-20 rounded-full bg-border flex items-center justify-center mb-6">
                    <Send className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white/80">Direct Message</h3>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[200px] leading-relaxed">End-to-end encrypted messaging active.</p>
                </motion.div>
              )}

              {messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
                const isLastInGroup = idx === messages.length - 1 || messages[idx + 1].sender_id !== msg.sender_id;
                const data = parseMessageContent(msg.content);

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
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
                      "max-w-[85%]"
                    )}>
                      <div
                        className={cn(
                          "rounded-[22px] text-sm relative transition-all duration-300 overflow-hidden",
                          isOwn
                            ? "bg-gradient-to-br from-primary to-accent text-white shadow-[0_10px_30px_rgba(124,58,237,0.2)]"
                            : "bg-white/5 border border-white/10 text-foreground backdrop-blur-xl shadow-xl",
                          isOwn && isLastInGroup ? "rounded-br-none" : "",
                          !isOwn && isLastInGroup ? "rounded-bl-none" : "",
                          (data.type === "image" || data.type === "video") ? "p-1.5" : "px-5 py-3.5"
                        )}
                      >
                        {data.type === "image" ? (
                          <div className="relative group">
                            <img src={data.url} alt="Shared" className="rounded-2xl max-w-full max-h-[350px] object-cover shadow-2xl" />
                            {data.text && <p className="px-3 pt-2 pb-1 text-sm font-medium">{data.text}</p>}
                          </div>
                        ) : data.type === "video" ? (
                          <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                            <video src={data.url} controls className="max-w-full max-h-[350px]" />
                            {data.text && <p className="px-3 pt-2 pb-1 text-sm font-medium">{data.text}</p>}
                          </div>
                        ) : data.type === "audio" ? (
                          <div className="flex items-center gap-4 min-w-[220px]">
                            <button
                              onClick={() => toggleAudioPlayback(msg.id, data.url)}
                              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shadow-lg active:scale-90"
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="h-4 w-4 fill-current" />
                              ) : (
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1 flex gap-1 items-center h-8">
                              {[...Array(15)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  animate={playingAudioId === msg.id
                                    ? { height: [`${20 + Math.random() * 60}%`, `${20 + Math.random() * 60}%`] }
                                    : { height: "30%" }
                                  }
                                  transition={{ repeat: Infinity, duration: 0.5, repeatType: "mirror", delay: i * 0.05 }}
                                  className="w-1 bg-white/40 rounded-full"
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-black opacity-40">AUDIO</span>
                          </div>
                        ) : (
                          <p className="leading-relaxed font-medium selection:bg-white/30 whitespace-pre-wrap">{data.content || data.text}</p>
                        )}
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
        layout
        className={cn("px-6 border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-3xl shrink-0", desktop ? "pb-4" : "pb-10")}
      >
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-4 mb-2 relative inline-block group"
            >
              <div className="absolute -top-2 -right-2 z-10">
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:scale-110 transition-transform border border-white/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {attachment.type === "image" ? (
                <img src={attachment.preview} alt="Preview" className="h-32 rounded-2xl border border-white/10 object-cover shadow-2xl" />
              ) : attachment.type === "video" ? (
                <div className="relative h-32 w-32 rounded-2xl border border-white/10 overflow-hidden bg-black flex items-center justify-center">
                  <VideoIcon className="h-8 w-8 text-white/20" />
                  <div className="absolute inset-0 bg-primary/10" />
                </div>
              ) : (
                <div className="h-16 w-56 flex items-center px-4 gap-4 bg-white/5 border border-white/10 rounded-2xl shadow-xl">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Volume2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Voice Message</span>
                    <span className="text-[9px] text-muted-foreground font-mono">READY TO SEND</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto flex items-end gap-3 pt-4">
          <div className="flex gap-2 mb-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white border border-white/5"
            >
              <Plus className="h-5 w-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          <div className="flex-1 relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-accent rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur-sm" />

            {isRecording ? (
              <div className="flex-1 bg-[#121212] border border-primary/20 rounded-2xl h-14 px-6 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  />
                  <span className="text-sm font-mono font-bold text-red-500 tracking-tighter">
                    {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                    {(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Voice Input</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.1 }} className="w-0.5 bg-primary/40 rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Input
                placeholder={attachment ? "Add accurate message..." : "Write a message..."}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleInputChange();
                }}
                onKeyDown={handleKeyDown}
                className="relative flex-1 bg-[#121212] border-white/5 rounded-2xl h-14 px-6 text-sm text-foreground placeholder:text-muted-foreground/20 focus-visible:ring-primary/20 focus-visible:border-primary/20 transition-all duration-300 shadow-inner"
              />
            )}
          </div>

          <div className="flex gap-2 mb-1.5">
            {!input.trim() && !attachment && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={cn(
                  "h-14 w-14 flex items-center justify-center rounded-2xl transition-all shadow-xl border",
                  isRecording
                    ? "bg-red-500 text-white border-red-400 scale-110 shadow-red-500/30"
                    : "bg-white/5 text-muted-foreground border-white/5 hover:border-white/10"
                )}
              >
                <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
              </motion.button>
            )}

            {(input.trim() || attachment) && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={sending}
                className="h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)] disabled:opacity-30 transition-all"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Visual Hints for Drag */}
      {!desktop && !inline && (
        <>
          <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-r-full pointer-events-none opacity-50" />
          <div className="fixed right-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-l-full pointer-events-none opacity-50" />
        </>
      )}
    </motion.div>
  );
}
