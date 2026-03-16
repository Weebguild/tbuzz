import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Search, Anchor } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserSearch } from "@/components/UserSearch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { icon: Home, path: "/feed", label: "Feed" },
  { icon: MessageSquare, path: "/gossip", label: "Gossip" },
  { icon: Mail, path: "/messages", label: "Messages" },
  { icon: User, path: "/profile", label: "Profile" },
];

function DockNavItem({
  item,
  isActive,
  mouseY,
  itemRef,
}: {
  item: typeof navItems[0];
  isActive: boolean;
  mouseY: ReturnType<typeof useMotionValue<number>>;
  itemRef: React.RefObject<HTMLDivElement | null>;
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
              isActive
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
                style={{ background: "hsl(var(--primary))" }}
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

  const navRefs = useRef([...Array(navItems.length)].map(() => ({ current: null as HTMLDivElement | null })));
  const searchRef = useRef<HTMLDivElement>(null);

  const searchDistance = useTransform(mouseY, (val) => {
    const rect = searchRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });
  const searchSize = useSpring(
    useTransform(searchDistance, [-120, 0, 120], [44, 56, 44]),
    { mass: 0.1, stiffness: 150, damping: 12 }
  );
  const searchIconSize = useTransform(searchSize, (val) => val * 0.5);

  const isActive = (path: string) => {
    if (path === "/feed") return location.pathname === "/feed" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div
        className="w-[80px] shrink-0 flex flex-col items-center py-8 gap-8 h-[100dvh] sticky top-0 relative z-30 overflow-visible"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <TooltipProvider delayDuration={200}>
          {/* ── Brand Logo ── */}
          <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center relative">
            <span
              className="text-[28px] font-black leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                backgroundImage: "linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsla(0, 0%, 100%, 0.65) 100%)",
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
            {navItems.map((item, i) => (
              <DockNavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                mouseY={mouseY}
                itemRef={navRefs.current[i] as any}
              />
            ))}
          </div>

          {/* ── Bottom Actions ── */}
          <div className="mt-auto mb-4 flex flex-col gap-4 items-center">
            {/* Ship entry point will be added in Step 4 */}

            {/* Search */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowSearch(true)}>
                  <motion.div
                    ref={searchRef}
                    className="flex items-center justify-center rounded-2xl transition-colors duration-300 text-muted-foreground hover:bg-white/5 hover:text-white"
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
    </>
  );
}
