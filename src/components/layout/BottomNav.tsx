import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { path: "/feed", icon: Home, label: "Feed" },
  { path: "/gossip", icon: MessageSquare, label: "Gossip" },
  { path: "/leaderboard", icon: Trophy, label: "Board" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === "/feed" && location.pathname === "/");
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-2 h-0.5 w-8 rounded-full gradient-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
