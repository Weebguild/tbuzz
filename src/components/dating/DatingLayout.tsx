import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Compass, User, Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/dating/discover", icon: Compass, label: "Discover" },
  { path: "/dating/crushes", icon: Sparkles, label: "Crushes" },
  { path: "/dating/profile", icon: User, label: "Profile" },
];

export function DatingLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="sunlit-gallery relative flex flex-col min-h-screen bg-[#faf8f5]">
      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-30 sg-frosted border-b border-black/[0.04]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-14">
          <button
            onClick={() => navigate("/feed")}
            className="flex items-center gap-2 text-sm font-medium opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "hsl(var(--sg-text))" }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tbuzz</span>
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4" style={{ color: "hsl(var(--sg-accent))" }} />
            <span
              className="font-editorial text-lg tracking-tight"
              style={{ color: "hsl(var(--sg-text))" }}
            >
              Sunlit Gallery
            </span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 max-w-lg mx-auto w-full pb-24 min-h-[calc(100dvh-56px-80px)] relative">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full absolute inset-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── BOTTOM NAV ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <nav className="pointer-events-auto sg-frosted bg-[#faf8f5]/80 backdrop-blur-xl rounded-full px-2 h-[60px] flex items-center gap-2 border border-black/[0.06]"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
        >
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              (tab.path === "/dating/discover" && location.pathname === "/dating");

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "relative flex items-center gap-2 px-5 h-11 rounded-full transition-all duration-300 text-sm font-medium",
                  isActive
                    ? "text-white"
                    : "hover:bg-black/[0.04]"
                )}
                style={{
                  color: isActive ? "white" : "hsl(var(--sg-text-muted))",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="dating-nav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "hsl(var(--sg-accent))" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
