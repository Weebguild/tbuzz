import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  X, Send, Loader2, Check, CheckCheck, Plus, Mic,
  Play, Pause, Image as ImageIcon, Video as VideoIcon,
  Trash2, Volume2, ChevronLeft, Info, MoreVertical,
  Smile, Reply, Share2, Copy, ExternalLink, Link as LinkIcon,
  Search, BellOff, Ban, Ghost
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ChatRoom({ desktop = false }: { desktop?: boolean }) {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sendMessage, markAsRead, isTyping, handleInputChange } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Gesture handling for back navigation
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [1, 0]);
  const scale = useTransform(x, [0, 100], [1, 0.95]);

  const dragControls = useDragControls();

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

  const parseMessageContent = (content: string) => {
    try {
      if (content.startsWith("{") && content.endsWith("}")) {
        return JSON.parse(content);
      }
    } catch (e) { }
    return { type: "text", content };
  };

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    return messages.filter(msg => {
      const data = parseMessageContent(msg.content);
      const searchTarget = (data.content || data.text || "").toLowerCase();
      return searchTarget.includes(chatSearchQuery.toLowerCase());
    });
  }, [messages, chatSearchQuery]);

  const handleSend = async () => {
    const messageContent = replyingTo
      ? JSON.stringify({ type: "reply", content: input, replyTo: replyingTo })
      : input;

    if ((!input.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      if (attachment) {
        const payload = replyingTo
          ? JSON.stringify({ type: "reply", content: input, replyTo: replyingTo, hasAttachment: true })
          : input;
        await sendMessage(payload, attachment.file, attachment.type);
      } else {
        await sendMessage(messageContent);
      }
      setInput("");
      setAttachment(null);
      setReplyingTo(null);
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
    if (info.offset.x > 80) {
      navigate("/messages");
    }
  };

  // Voice Recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder?.stop();

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

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (conversationId) {
      const muted = localStorage.getItem(`muted_${conversationId}`);
      setIsMuted(!!muted);
    }
  }, [conversationId]);

  const handleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (newState) {
      localStorage.setItem(`muted_${conversationId}`, "true");
      toast.success("Notifications muted");
    } else {
      localStorage.removeItem(`muted_${conversationId}`);
      toast.success("Notifications enabled");
    }
  };

  const handleBlock = async () => {
    if (!recipient || !conversationId) return;
    const confirm = window.confirm(`Are you sure you want to block ${recipient.display_name}? You will no longer receive messages from them.`);
    if (!confirm) return;

    toast.promise(
      new Promise(async (resolve) => {
        const blockedUsers = JSON.parse(localStorage.getItem("blocked_users") || "[]");
        if (!blockedUsers.includes(recipient.user_id)) {
          localStorage.setItem("blocked_users", JSON.stringify([...blockedUsers, recipient.user_id]));
        }
        setTimeout(resolve, 800);
      }),
      {
        loading: 'Blocking user...',
        success: () => {
          navigate('/messages');
          return `${recipient.display_name} has been blocked`;
        },
        error: 'Failed to block user',
      }
    );
  };

  const handleClearHistory = async () => {
    if (!conversationId) return;
    const confirm = window.confirm("Are you sure you want to clear all messages? This action cannot be reversed.");
    if (!confirm) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (error) {
      toast.error("Failed to clear history");
    } else {
      toast.success("Chat history cleared");
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


  const sharedMedia = useMemo(() => {
    return messages.filter(m => {
      const data = parseMessageContent(m.content);
      return data.type === "image" || data.type === "video";
    }).map(m => parseMessageContent(m.content));
  }, [messages]);

  const LinkPreview = ({ url }: { url: string }) => {
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-2 block rounded-2xl glass-panel border-l-2 border-primary/30 overflow-hidden hover:bg-white/[0.06] transition-all group/link"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <LinkIcon className="h-5 w-5 opacity-40 group-hover/link:opacity-100 transition-opacity" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">{domain}</p>
            <p className="text-sm font-bold truncate opacity-80">{url}</p>
          </div>
          <ExternalLink className="h-4 w-4 opacity-20" />
        </div>
      </motion.a>
    );
  };

  const getUrlFromText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin shadow-2xl shadow-primary/40" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={desktop ? {} : { x, opacity, scale }}
      drag={desktop ? false : "x"}
      dragControls={dragControls}
      dragListener={false}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 100 }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      className={cn(
        "z-50 flex flex-col bg-transparent text-white",
        desktop ? "relative h-full w-full" : "fixed inset-0"
      )}
    >
      {/* Background handled by global aurora */}

      {/* Flagship Header */}
      <header
        onPointerDown={(e) => !showChatSearch && dragControls.start(e)}
        className="relative z-30 px-6 py-5 flex items-center justify-between bg-transparent backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center gap-5 flex-1 mr-4">
          {!showChatSearch ? (
            <>
              <button
                onClick={() => navigate("/messages")}
                className="p-2 rounded-2xl hover:bg-white/5 transition-colors group"
              >
                <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              {recipient && (
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowInfo(true)}>
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-xl">
                      <AvatarImage src={recipient.avatar_url || ""} />
                      <AvatarFallback className="bg-white/5 text-xs font-black">
                        {recipient.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-success rounded-full border-2 border-background" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-base tracking-tight leading-none mb-1">
                      {recipient.display_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Online</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 w-full animate-in slide-in-from-left-4 duration-300">
              <Search className="h-5 w-5 opacity-40" />
              <input
                autoFocus
                type="text"
                autoComplete="off"
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search messages..."
                className="bg-transparent border-none focus:ring-0 outline-none flex-1 text-sm font-bold placeholder:text-white/20 text-white caret-primary"
              />
              <button
                onClick={() => {
                  setShowChatSearch(false);
                  setChatSearchQuery("");
                }}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!showChatSearch && (
            <button onClick={() => setShowInfo(true)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
              <Info className="h-5 w-5 opacity-60" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
                <MoreVertical className="h-5 w-5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/80 backdrop-blur-xl border-white/10 text-white rounded-2xl p-2 z-[100]">
              <DropdownMenuItem
                onSelect={() => setShowChatSearch(true)}
                className="rounded-xl flex gap-3 p-3 focus:bg-white/5 cursor-pointer"
              >
                <Search className="h-4 w-4 opacity-40" />
                <span className="font-bold text-sm">Search Chat</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleMute}
                className="rounded-xl flex gap-3 p-3 focus:bg-white/5 cursor-pointer"
              >
                {isMuted ? <Volume2 className="h-4 w-4 opacity-40" /> : <BellOff className="h-4 w-4 opacity-40" />}
                <span className="font-bold text-sm">{isMuted ? "Unmute Notifications" : "Mute Notifications"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                onSelect={handleBlock}
                className="rounded-xl flex gap-3 p-3 focus:bg-white/5 cursor-pointer text-red-400 focus:text-red-400"
              >
                <Ban className="h-4 w-4" />
                <span className="font-bold text-sm">Block User</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleClearHistory}
                className="rounded-xl flex gap-3 p-3 focus:bg-white/5 cursor-pointer text-red-500 focus:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-bold text-sm">Clear History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea
          className="h-full px-6 py-8"
          onScroll={(e) => {
            const target = e.currentTarget;
            const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
            setShowScrollButton(!isBottom);
          }}
        >
          <div className="max-w-3xl mx-auto space-y-12">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredMessages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                const nextMsg = filteredMessages[idx + 1];
                const prevMsg = filteredMessages[idx - 1];
                const data = parseMessageContent(msg.content);
                const isGrouping = prevMsg?.sender_id === msg.sender_id;
                const isLastInGroup = nextMsg?.sender_id !== msg.sender_id;

                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn(
                      "flex items-end gap-3",
                      isOwn ? "flex-row-reverse" : "flex-row",
                      isGrouping ? "mt-1" : "mt-8"
                    )}
                  >
                    {!isOwn && (
                      <div className="w-8 shrink-0">
                        {isLastInGroup && recipient && (
                          <Avatar className="h-8 w-8 ring-1 ring-white/10 shadow-lg">
                            <AvatarImage src={recipient.avatar_url || ""} />
                            <AvatarFallback className="text-[10px] font-bold bg-white/5">
                              {recipient.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "flex flex-col gap-1 max-w-[80%]",
                      isOwn ? "items-end" : "items-start"
                    )}>
                      {/* Swipe Context Action would go here */}
                      <div className="relative group/bubble">
                        <div
                          className={cn(
                            "rounded-[28px] text-[15px] font-medium leading-relaxed transition-all duration-300 relative",
                            isOwn
                              ? "bg-primary text-white shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] border border-primary/20"
                              : "bg-white/[0.04] backdrop-blur-sm text-white/90 border border-white/5",
                            isOwn && isLastInGroup ? "rounded-br-lg" : "",
                            !isOwn && isLastInGroup ? "rounded-bl-lg" : "",
                            (data.type === "image" || data.type === "video") ? "p-1.5" : "px-6 py-4"
                          )}
                        >
                          {data.type === "reply" && (
                            <div className="mb-3 p-3 rounded-2xl bg-black/20 border-l-4 border-primary/40 text-sm overflow-hidden opacity-80">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">Replying to</p>
                              <p className="truncate italic">"{data.replyTo.content}"</p>
                            </div>
                          )}

                          {data.type === "image" && data.url ? (
                            <div
                              onClick={() => setSelectedMedia(data.url)}
                              className="relative group cursor-pointer overflow-hidden rounded-[24px]"
                            >
                              <img src={data.url} alt="Shared" className="w-full h-full object-cover max-h-[400px]" />
                              {data.text && <p className="px-4 py-3 text-sm">{data.text}</p>}
                            </div>
                          ) : data.type === "audio" && data.url ? (
                            <div className="flex items-center gap-4 py-1 px-2 min-w-[200px]">
                              <button
                                onClick={() => toggleAudioPlayback(msg.id, data.url)}
                                className="h-12 w-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                              >
                                {playingAudioId === msg.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
                              </button>
                              <div className="flex-1 flex gap-1 items-center h-8">
                                {[...Array(14)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    animate={playingAudioId === msg.id
                                      ? { height: [`${30 + Math.random() * 50}%`, `${30 + Math.random() * 50}%`] }
                                      : { height: "20%" }
                                    }
                                    transition={{ repeat: Infinity, duration: 0.4, delay: i * 0.03 }}
                                    className="w-1 bg-white/40 rounded-full"
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="whitespace-pre-wrap">{data.content || data.text}</p>
                              {data.content && getUrlFromText(data.content)?.map((url, i) => (
                                <LinkPreview key={i} url={url} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick Reactions Hidden by Default */}
                        <div className={cn(
                          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all flex gap-1 px-2",
                          isOwn ? "right-full mr-2" : "left-full ml-2"
                        )}>
                          <button onClick={() => setReplyingTo(data)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <Reply className="h-4 w-4" />
                          </button>
                          {["🔥", "❤️", "😂", "😮"].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => setReactions(prev => ({ ...prev, [msg.id]: emoji }))}
                              className="p-1.5 text-sm hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {reactions[msg.id] && (
                          <div className={cn(
                            "absolute -bottom-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs",
                            isOwn ? "left-0" : "right-0"
                          )}>
                            {reactions[msg.id]}
                          </div>
                        )}
                      </div>

                      {isLastInGroup && (
                        <div className={cn(
                          "flex items-center gap-2 mt-1 px-2 opacity-30",
                          isOwn ? "flex-row-reverse" : "flex-row"
                        )}>
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {formatDistanceToNow(new Date(msg.created_at))}
                          </span>
                          {isOwn && (
                            msg.is_read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mt-4">
                  <div className="h-8 w-12 bg-white/[0.04] backdrop-blur-sm border border-white/5 rounded-full flex items-center justify-center gap-1.5 px-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} className="h-12" />
          </div>
        </ScrollArea>
        {/* Gradient fade into input */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none bg-gradient-to-t from-background/80 to-transparent z-10" />
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="absolute bottom-32 right-8 h-12 w-12 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronLeft className="h-6 w-6 rotate-[-90deg]" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Flagship Input Experience */}
      <footer
        onPointerDown={(e) => e.stopPropagation()}
        className="relative z-40 px-6 pb-6 pt-3 bg-transparent backdrop-blur-xl"
      >
        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden">
              <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Reply className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm truncate opacity-60">Replying to: {replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {attachment && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="mb-4">
              <div className="relative inline-block group">
                {attachment.type === "image" ? (
                  <img src={attachment.preview} className="h-32 w-32 rounded-3xl object-cover border-4 border-white/5" />
                ) : (
                  <div className="h-20 w-48 rounded-3xl bg-primary text-white flex items-center px-4 gap-3">
                    <Volume2 className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Voice message ready</span>
                  </div>
                )}
                <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 p-2 rounded-full bg-red-500 text-white shadow-xl">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-end gap-3 max-w-4xl mx-auto"
        >
          <div className="flex gap-2 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white border border-white/5"
            >
              <Plus className="h-6 w-6" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
          </div>

          <div className="flex-1 relative group">
            <div className="pointer-events-none absolute -inset-[1px] bg-gradient-to-r from-primary to-accent rounded-[32px] opacity-0 group-focus-within:opacity-20 transition duration-500 blur-md" />

            {isRecording ? (
              <div className="bg-white/[0.04] backdrop-blur-sm rounded-[32px] h-16 px-6 flex items-center justify-between border border-primary/20">
                <div className="flex items-center gap-3">
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-3 w-3 rounded-full bg-red-500 shadow-xl shadow-red-500/40" />
                  <span className="text-sm font-mono font-bold text-red-500 tracking-tighter">
                    {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div key={i} animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }} className="w-0.5 bg-primary/40 rounded-full" />
                  ))}
                </div>
              </div>
            ) : (
              <input
                type="text"
                autoComplete="off"
                placeholder="Type a message..."
                value={input}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleInputChange();
                }}
                onKeyDown={handleKeyDown}
                className="bg-white/[0.04] backdrop-blur-sm border border-white/5 rounded-[32px] h-16 px-6 text-base text-white caret-primary placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 w-full"
              />
            )}
          </div>

          <div className="mb-1">
            <AnimatePresence mode="wait">
              {!input.trim() && !attachment ? (
                <motion.button
                  key="mic"
                  type="button"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  whileTap={{ scale: 0.9, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center transition-all border",
                    isRecording ? "bg-red-500 text-white border-red-400 scale-125 shadow-2xl shadow-red-500/50" : "bg-white/5 text-white/40 border-white/5"
                  )}
                >
                  <Mic className="h-6 w-6" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="submit"
                  initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 45 }}
                  disabled={sending}
                  className="h-16 w-16 rounded-full bg-primary text-white shadow-2xl shadow-primary/30 flex items-center justify-center disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 ml-0.5" />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      </footer>

      {/* Side Panels - Info Panel */}
      <AnimatePresence>
        {showInfo && recipient && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col pt-12"
          >
            <div className="px-6 flex items-center justify-between mb-8">
              <button onClick={() => setShowInfo(false)} className="p-3 rounded-2xl bg-white/5">
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Details</h2>
              <div className="w-12" />
            </div>

            <ScrollArea className="flex-1 px-8">
              <div className="flex flex-col items-center mb-12">
                <Avatar className="h-32 w-32 ring-4 ring-primary/20 shadow-2xl mb-6">
                  <AvatarImage src={recipient.avatar_url || ""} />
                  <AvatarFallback className="text-4xl font-black bg-white/5">
                    {recipient.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-3xl font-black tracking-tighter mb-2">{recipient.display_name}</h3>
                <p className="text-xs text-primary font-black uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full">Mutual Connection</p>
              </div>

              <div className="space-y-10">
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Shared Media</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {sharedMedia.slice(0, 9).map((media, i) => (
                      <div key={i} className="aspect-square rounded-2xl bg-white/5 overflow-hidden group">
                        <img src={media.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ))}
                    {sharedMedia.length === 0 && <p className="col-span-3 text-center py-8 text-white/20 text-xs italic">No shared media yet</p>}
                  </div>
                </section>

                <section className="space-y-4">
                  <button className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/5 hover:bg-white/10 transition-all font-bold">
                    <div className="flex items-center gap-4 text-white/60">
                      <Share2 className="h-5 w-5" />
                      <span>Share Profile</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180 opacity-20" />
                  </button>
                  <button
                    onClick={() => {
                      if (recipient) {
                        navigator.clipboard.writeText(recipient.user_id);
                        toast.success("Username copied");
                      }
                    }}
                    className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/5 hover:bg-white/10 transition-all font-bold"
                  >
                    <div className="flex items-center gap-4 text-white/60">
                      <Copy className="h-5 w-5" />
                      <span>Copy Username</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180 opacity-20" />
                  </button>
                  <button className="w-full flex items-center justify-between p-5 rounded-3xl bg-red-500/10 hover:bg-red-500/20 transition-all font-bold text-red-500">
                    <div className="flex items-center gap-4">
                      <Trash2 className="h-5 w-5" />
                      <span>Clear Chat History</span>
                    </div>
                  </button>
                </section>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col pt-12"
          >
            <div className="px-6 flex justify-end">
              <button
                onClick={() => setSelectedMedia(null)}
                className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <motion.img
                layoutId={`media-${selectedMedia}`}
                src={selectedMedia}
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
