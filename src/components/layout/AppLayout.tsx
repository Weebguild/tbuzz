import { Outlet, useLocation } from "react-router-dom";
import { DesktopSidebar } from "./DesktopSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isMessagesRoute = location.pathname.startsWith("/messages");
  const isInChatRoom = isMessagesRoute && location.pathname.split("/").filter(Boolean).length > 1;

  const useLockedLayout = isMessagesRoute && (!isMobile || isInChatRoom);

  return (
    <div className="min-h-screen bg-black relative selection:bg-primary/30 flex">
      {/* ── THE AURORA BACKGROUND ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7C3AED] mix-blend-screen filter blur-[80px] opacity-30 animate-aurora-1 motion-reduce:animate-none will-change-transform" />
        <div className="absolute top-[40%] right-[-20%] w-[400px] h-[400px] rounded-full bg-[#EC4899] mix-blend-screen filter blur-[80px] opacity-20 animate-aurora-2 motion-reduce:animate-none will-change-transform" />
        <div
          className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#3B82F6] mix-blend-screen filter blur-[100px] opacity-20 animate-aurora-1 motion-reduce:animate-none will-change-transform"
          style={{ animationDelay: "-5s" }}
        />
      </div>

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && <DesktopSidebar />}

      {/* ── THE CONTENT LAYER ── */}
      <main className={cn(
        "relative z-10 flex-1 min-w-0",
        useLockedLayout
          ? "max-w-none pb-0 h-[100dvh] overflow-hidden"
          : "max-w-lg mx-auto pb-24 min-h-screen"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── MOBILE BOTTOM NAV — rendered in App.tsx outside transform context ── */}
    </div>
  );
}
