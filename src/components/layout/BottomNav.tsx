import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserSearch } from "@/components/UserSearch";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { path: "/feed", icon: Home },
  { path: "/gossip", icon: MessageSquare },
  { path: "center", icon: Plus, isCenter: true },
  { path: "/messages", icon: Mail },
  { path: "/profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Hide when post expander is open
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setHidden(document.body.hasAttribute("data-expander-open"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-expander-open"] });
    return () => observer.disconnect();
  }, []);

  // Unread messages count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();

    const channel = supabase
      .channel("unread-messages-nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isMessagesPage = location.pathname.startsWith("/messages");
  const isInChatRoom = isMessagesPage && location.pathname.split("/").filter(Boolean).length > 1;

  // Hide when: expander open, OR inside a chat room
  if (hidden || isInChatRoom) return null;

  return (
    <>
      {/* Redesigned Cyber-Glow Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <UserSearch onClose={() => setShowSearch(false)} />
        )}
      </AnimatePresence>

      {/* Floating Glass Bottom Nav Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <nav className="relative flex items-center justify-between w-full max-w-[340px] h-[64px] pointer-events-auto bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/10 rounded-full px-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">
          {tabs.map((tab) => {
            // Render the Center Floating Button
            if (tab.isCenter) {
              return (
                <div key={tab.path} className="relative flex-1 flex justify-center items-center h-full">
                  <button
                    onClick={() => setShowSearch(true)}
                    className="absolute -top-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent shadow-[0_8px_25px_rgba(236,72,153,0.5)] transition-transform active:scale-90 hover:scale-105 border-[4px] border-[#000000]"
                  >
                    <Search className="h-6 w-6 text-white drop-shadow-md" />
                  </button>
                </div>
              );
            }

            const isActive = location.pathname === tab.path || (tab.path === "/feed" && location.pathname === "/") || (tab.path === "/messages" && location.pathname.startsWith("/messages"));

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="flex flex-1 items-center justify-center h-full relative group"
              >
                {/* Active Highlight Background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-y-2 inset-x-2 bg-white/10 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="relative z-10">
                  <tab.icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-300",
                      isActive
                        ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                        : "text-muted-foreground group-hover:text-white/70",
                    )}
                    fill="none"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {tab.path === "/messages" && unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    </div>
                  )}
                </div>

                {/* Active Bottom Dot */}
                {isActive && (
                  <div className="absolute bottom-[6px] w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,1)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
