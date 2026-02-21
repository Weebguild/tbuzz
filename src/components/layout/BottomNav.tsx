import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Trophy, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/feed", icon: Home },
  { path: "/gossip", icon: MessageSquare },
  { path: "compose", icon: Plus, isCenter: true },
  { path: "/leaderboard", icon: Trophy },
  { path: "/profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <div key={tab.path} className="flex items-center justify-center -mt-5">
                <Link
                  to="/feed"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground shadow-lg"
                >
                  <Plus className="h-6 w-6 text-background" />
                </Link>
              </div>
            );
          }

          const isActive =
            location.pathname === tab.path ||
            (tab.path === "/feed" && location.pathname === "/");

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-1 items-center justify-center py-2"
            >
              <tab.icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                fill={isActive ? "currentColor" : "none"}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
