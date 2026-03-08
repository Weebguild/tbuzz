import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isMessagesRoute = location.pathname.startsWith("/messages");
  const isInChatRoom = isMessagesRoute && location.pathname.split("/").filter(Boolean).length > 1;

  // On desktop messages or mobile chat room: full height locked layout
  // On mobile messages list: normal scrollable layout with bottom nav space
  const useLockedLayout = isMessagesRoute && (!isMobile || isInChatRoom);

  return (
    <div className={cn("min-h-screen bg-black relative selection:bg-primary/30", useLockedLayout && "h-[100dvh] overflow-hidden")}>
      {/* ── THE AURORA BACKGROUND ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep Purple Orb */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7C3AED] mix-blend-screen filter blur-[120px] opacity-30 animate-aurora-1" />
        {/* Neon Pink Orb */}
        <div className="absolute top-[40%] right-[-20%] w-[400px] h-[400px] rounded-full bg-[#EC4899] mix-blend-screen filter blur-[120px] opacity-20 animate-aurora-2" />
        {/* Dark Blue Orb (Base) */}
        <div
          className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#3B82F6] mix-blend-screen filter blur-[150px] opacity-20 animate-aurora-1"
          style={{ animationDelay: "-5s" }}
        />
      </div>

      {/* ── THE CONTENT LAYER ── */}
      <main className={cn("relative z-10 mx-auto", useLockedLayout ? "max-w-none pb-0 h-[100dvh] overflow-hidden" : "max-w-lg pb-24 min-h-screen")}>
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
