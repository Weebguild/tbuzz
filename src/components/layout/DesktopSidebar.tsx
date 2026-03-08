import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserSearch } from "@/components/UserSearch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { icon: Home, path: "/feed", label: "Feed" },
  { icon: MessageSquare, path: "/gossip", label: "Gossip" },
  { icon: Mail, path: "/messages", label: "Messages" },
  { icon: User, path: "/profile", label: "Profile" },
];

export function DesktopSidebar() {
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);

  const isActive = (path: string) => {
    if (path === "/feed") return location.pathname === "/feed" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className="w-[80px] border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-black/40 shrink-0 h-[100dvh] sticky top-0">
        <Link to="/feed" className="group">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 transition-transform cursor-pointer relative overflow-hidden">
            <span className="text-3xl font-black text-white relative z-10" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>T</span>
          </div>
        </Link>
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-col gap-6 mt-8">
            {navItems.map((item) => (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      "p-3 rounded-2xl transition-all duration-300 group relative",
                      isActive(item.path)
                        ? "bg-white/10 text-white shadow-xl"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    {isActive(item.path) && (
                      <motion.div
                        layoutId="desktop-sidebar-active"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="mt-auto mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-3 rounded-2xl transition-all duration-300 text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  <Search className="h-6 w-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
                Search
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <AnimatePresence>
        {showSearch && <UserSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
    </>
  );
}
