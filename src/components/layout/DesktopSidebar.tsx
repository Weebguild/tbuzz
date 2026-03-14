import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Search, Compass, MessageCircleHeart, Flame } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserSearch } from "@/components/UserSearch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DatingTransitionOverlay, useDatingTransition } from "@/components/dating/DatingTransition";

const navItems = [
  { icon: Home, path: "/feed", label: "Feed" },
  { icon: MessageSquare, path: "/gossip", label: "Gossip" },
  { icon: Mail, path: "/messages", label: "Messages" },
  { icon: User, path: "/profile", label: "Profile" },
];

const datingNavItems = [
  { icon: Compass, path: "/dating/discover", label: "Discover" },
  { icon: MessageCircleHeart, path: "/dating/matches", label: "Matches" },
  { icon: User, path: "/dating/profile", label: "Profile" },
];

function DockNavItem({
  item,
  isActive,
  mouseY,
  itemRef,
  isDating,
}: {
  item: typeof navItems[0];
  isActive: boolean;
  mouseY: ReturnType<typeof useMotionValue<number>>;
  itemRef: React.RefObject<HTMLDivElement | null>;
  isDating?: boolean;
}) {
  const distance = useTransform(mouseY, (val) => {
    const rect = itemRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });

  const sizeTransform = useTransform(distance, [-120, 0, 120], [44, 56, 44]);
  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const iconSize = useTransform(size, (val) => val * 0.5);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={item.path}>
          <motion.div
            ref={itemRef}
            className={cn(
              "flex items-center justify-center rounded-2xl transition-colors duration-300 group relative",
              isDating
                ? isActive
                  ? "bg-rose-100/80 text-rose-700"
                  : "text-stone-500 hover:bg-rose-50 hover:text-rose-600"
                : isActive
                ? "bg-white/10 text-white shadow-xl"
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
            style={{ width: size, height: size }}
          >
            <motion.div style={{ width: iconSize, height: iconSize }} className="flex items-center justify-center">
              <item.icon className="w-full h-full" />
            </motion.div>
            {isActive && (
              <motion.div
                layoutId="desktop-sidebar-active"
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                style={{ background: isDating ? "hsl(340, 72%, 52%)" : "hsl(var(--primary))" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="z-[9999] bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function DesktopSidebar() {
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const mouseY = useMotionValue(Infinity);
  const isDating = location.pathname.startsWith("/dating");
  const { transitioning, enterDating, exitDating } = useDatingTransition();

  const currentNavItems = isDating ? datingNavItems : navItems;
  const navRefs = useRef([...Array(Math.max(navItems.length, datingNavItems.length))].map(() => ({ current: null as HTMLDivElement | null })));
  const searchRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);

  const searchDistance = useTransform(mouseY, (val) => {
    const rect = searchRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });
  const searchSize = useSpring(
    useTransform(searchDistance, [-120, 0, 120], [44, 56, 44]),
    { mass: 0.1, stiffness: 150, damping: 12 }
  );
  const searchIconSize = useTransform(searchSize, (val) => val * 0.5);

  const sparkDistance = useTransform(mouseY, (val) => {
    const rect = sparkRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });
  const sparkSize = useSpring(
    useTransform(sparkDistance, [-120, 0, 120], [44, 56, 44]),
    { mass: 0.1, stiffness: 150, damping: 12 }
  );
  const sparkIconSize = useTransform(sparkSize, (val) => val * 0.5);

  const isActive = (path: string) => {
    if (path === "/feed") return location.pathname === "/feed" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div
        className="w-[80px] shrink-0 flex flex-col items-center py-8 gap-8 h-[100dvh] sticky top-0 relative z-30 overflow-visible"
        style={isDating ? {
          background: "rgba(255, 248, 242, 0.82)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(220, 180, 170, 0.3)",
        } : {
          background: "rgba(0,0,0,0.4)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <TooltipProvider delayDuration={200}>
          {/* ── Brand Logo (non-interactive) ── */}
          <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center relative">
            <span
              className="text-[28px] font-black leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                backgroundImage: isDating
                  ? "linear-gradient(180deg, hsl(340, 75%, 60%) 0%, hsl(340, 70%, 48%) 100%)"
                  : "linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsla(0, 0%, 100%, 0.65) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              T
            </span>
            <span className="absolute bottom-[7px] right-[7px] w-[5px] h-[5px] rounded-full bg-primary" />
          </div>

          {/* ── Nav Items ── */}
          <div className="flex flex-col gap-6 mt-8 items-center">
            {currentNavItems.map((item, i) => (
              <DockNavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                mouseY={mouseY}
                itemRef={navRefs.current[i] as any}
                isDating={isDating}
              />
            ))}
          </div>

          {/* ── Bottom Actions ── */}
          <div className="mt-auto mb-4 flex flex-col gap-4 items-center">
            {/* Spark / Back to Tbuzz toggle button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => isDating ? exitDating() : enterDating()}>
                  <motion.div
                    ref={sparkRef}
                    className={cn(
                      "flex items-center justify-center rounded-2xl transition-all duration-300 relative",
                      isDating
                        ? "text-stone-600 hover:text-stone-800"
                        : "text-muted-foreground hover:text-white"
                    )}
                    style={{
                      width: sparkSize,
                      height: sparkSize,
                      background: isDating
                        ? undefined
                        : "linear-gradient(135deg, hsla(25, 90%, 55%, 0.15), hsla(340, 75%, 55%, 0.1))",
                      border: isDating ? undefined : "1px solid hsla(25, 90%, 55%, 0.2)",
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div style={{ width: sparkIconSize, height: sparkIconSize }} className="flex items-center justify-center">
                      {isDating ? (
                        <Home className="w-full h-full" />
                      ) : (
                        <Flame className="w-full h-full" style={{ color: "hsl(25, 90%, 55%)" }} />
                      )}
                    </motion.div>
                  </motion.div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[9999] bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
                {isDating ? "Back to Tbuzz" : "Spark"}
              </TooltipContent>
            </Tooltip>

            {/* Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowSearch(true)}>
                  <motion.div
                    ref={searchRef}
                    className={cn(
                      "flex items-center justify-center rounded-2xl transition-colors duration-300",
                      isDating
                        ? "text-stone-500 hover:bg-rose-50 hover:text-rose-600"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                    style={{ width: searchSize, height: searchSize }}
                  >
                    <motion.div style={{ width: searchIconSize, height: searchIconSize }} className="flex items-center justify-center">
                      <Search className="w-full h-full" />
                    </motion.div>
                  </motion.div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-[9999] bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
                Search
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <AnimatePresence>
        {showSearch && <UserSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {transitioning && <DatingTransitionOverlay direction={transitioning} />}
      </AnimatePresence>
    </>
  );
}
