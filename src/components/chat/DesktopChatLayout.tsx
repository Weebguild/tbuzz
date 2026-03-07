import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Mail, MessageSquare, Home, User,
    Settings, LogOut, ChevronRight, Files, Image, Link as LinkIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import ChatRoom from "@/pages/ChatRoom";
import { UserSearch } from "@/components/UserSearch";

export function DesktopChatLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { conversationId } = useParams();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);

    // Replicating the logic from Messages.tsx for the sidebar
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

            const items = [];
            for (const conv of convs || []) {
                const otherParticipant = allParticipants?.find(p => p.conversation_id === conv.id);
                const otherProfile = profiles?.find(p => p.user_id === otherParticipant?.user_id);

                const { data: lastMsg } = await supabase
                    .from("messages")
                    .select("content, created_at")
                    .eq("conversation_id", conv.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (otherProfile) {
                    items.push({
                        id: conv.id,
                        updated_at: conv.updated_at,
                        other_user: otherProfile,
                        last_message: lastMsg?.content ? (
                            lastMsg.content.includes('"type":"') ? "Media Attachment" : lastMsg.content
                        ) : "Start the conversation..."
                    });
                }
            }
            setConversations(items);
            setLoading(false);
        };
        fetchConversations();
    }, [user]);

    // Media assets fetching
    const [mediaAssets, setMediaAssets] = useState<{ photos: any[], files: any[] }>({ photos: [], files: [] });

    useEffect(() => {
        if (!conversationId) return;
        const fetchMedia = async () => {
            const { data: msgs } = await supabase
                .from("messages")
                .select("content, created_at")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: false });

            const photos: any[] = [];
            const files: any[] = [];

            msgs?.forEach(m => {
                try {
                    if (m.content.startsWith("{")) {
                        const data = JSON.parse(m.content);
                        if (data.type === "image") photos.push({ url: data.url, date: m.created_at });
                        if (data.type === "video") files.push({ url: data.url, type: "video", date: m.created_at, name: data.text || "Shared Video" });
                        if (data.type === "audio") files.push({ url: data.url, type: "audio", date: m.created_at, name: "Voice Message" });
                    }
                } catch (e) { }
            });
            setMediaAssets({ photos, files });
        };
        fetchMedia();
    }, [conversationId]);

    return (
        <div className="h-full w-full bg-[#0A0A0A] flex overflow-hidden font-sans">
            {/* COLUMN 1: ACTION BAR (Red/Yellow/White Circles in Image) */}
            <div className="w-[80px] border-r border-white/5 flex flex-col items-center py-6 gap-8 bg-black/40 shrink-0">
                {/* App Logo */}
                <Link to="/feed" className="group">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 transition-transform cursor-pointer relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <span className="text-3xl font-black text-white relative z-10" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>T</span>
                    </div>
                </Link>

                {/* Navigation (Yellow Area) */}
                <div className="flex flex-col gap-4">
                    {[
                        { icon: Home, path: "/feed" },
                        { icon: MessageSquare, path: "/gossip" },
                        { icon: Mail, path: "/messages", active: true },
                        { icon: User, path: "/profile" },
                    ].map((item, i) => (
                        <Link
                            key={i}
                            to={item.path}
                            className={cn(
                                "p-3 rounded-2xl transition-all duration-300 group relative",
                                item.active ? "bg-white/10 text-white shadow-xl" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className="h-6 w-6" />
                            {item.active && (
                                <motion.div layoutId="sidebar-active" className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                            )}
                            <div className="absolute left-full ml-4 px-2 py-1 bg-white text-black text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 capitalize">
                                {item.path.split('/').pop() || 'feed'}
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Search/Plus Button (White Circle) */}
                <div className="mt-auto">
                    <button
                        onClick={() => setShowSearch(true)}
                        className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        <Plus className="h-6 w-6 stroke-[3px]" />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSearch && (
                    <UserSearch onClose={() => setShowSearch(false)} />
                )}
            </AnimatePresence>

            {/* COLUMN 2: CONVERSATION LIST */}
            <div className="w-[320px] border-r border-white/5 flex flex-col bg-black/20 shrink-0 min-h-0">
                <div className="p-6">
                    <h2 className="text-2xl font-black tracking-tighter text-white mb-6 uppercase">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Search conversations..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl h-10 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="space-y-1">
                        {conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => navigate(`/messages/${conv.id}`)}
                                className={cn(
                                    "w-full p-3 rounded-2xl flex items-center gap-4 transition-all group",
                                    conversationId === conv.id ? "bg-white/5 border border-white/5" : "hover:bg-white/[0.03]"
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-12 w-12 ring-2 ring-white/5 group-hover:ring-primary/40 transition-all">
                                        {conv.other_user.avatar_url ? (
                                            <AvatarImage src={conv.other_user.avatar_url} />
                                        ) : (
                                            <AvatarFallback className="bg-white/5 text-sm font-bold">
                                                {conv.other_user.display_name.charAt(0)}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-success rounded-full border-2 border-black" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="font-bold text-sm text-white truncate">{conv.other_user.display_name}</p>
                                    <p className="text-xs text-muted-foreground truncate opacity-60">
                                        {conv.last_message || "No messages yet"}
                                    </p>
                                </div>
                                <ChevronRight className={cn(
                                    "h-4 w-4 text-white/10 group-hover:text-primary transition-all",
                                    conversationId === conv.id && "text-primary opacity-100"
                                )} />
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* COLUMN 3: MAIN CHAT AREA (Blue Box) */}
            <div className="flex-1 flex flex-col relative bg-[#0A0A0A] min-w-0 min-h-0 overflow-hidden">
                {conversationId ? (
                    <div className="flex-1 flex flex-col">
                        <ChatRoom desktop={true} />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center mb-8 border border-white/5">
                            <Mail className="h-12 w-12 text-primary/20" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-[0.3em] text-white/90">Select a Chat</h2>
                        <p className="text-muted-foreground mt-4 max-w-sm leading-relaxed">Choose a conversation from the sidebar to start messaging your friends.</p>
                    </div>
                )}
            </div>

            <div className="w-[300px] border-l border-white/5 bg-black/40 flex flex-col shrink-0 min-h-0">
                <div className="p-8 border-b border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Shared Files</h3>
                    <div className="flex gap-4">
                        <div className="flex-1 p-4 rounded-3xl bg-white/5 text-center border border-white/5">
                            <p className="text-xl font-black text-white">{mediaAssets.files.length}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Media</p>
                        </div>
                        <div className="flex-1 p-4 rounded-3xl bg-white/5 text-center border border-white/5">
                            <p className="text-xl font-black text-white">{mediaAssets.photos.length}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Photos</p>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8">
                    <div className="space-y-8">
                        {mediaAssets.photos.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Shared Photos</h4>
                                    <button className="text-[10px] font-bold text-muted-foreground hover:text-white transition-colors">View All</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {mediaAssets.photos.slice(0, 4).map((photo, i) => (
                                        <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all">
                                            <img src={photo.url} alt="Shared" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {mediaAssets.files.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Shared Files</h4>
                                </div>
                                <div className="space-y-2">
                                    {mediaAssets.files.slice(0, 5).map((file, i) => (
                                        <div key={i} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer group">
                                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                {file.type === "audio" ? <Files className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                                                    {formatDistanceToNow(new Date(file.date))}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Shared Links</h4>
                            </div>
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex gap-4 items-start group cursor-pointer">
                                        <LinkIcon className="h-4 w-4 text-muted-foreground mt-1 group-hover:text-primary transition-colors" />
                                        <div>
                                            <p className="text-xs font-bold text-white leading-snug group-hover:underline">https://shared.link/reference/...</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Shared Resource</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
