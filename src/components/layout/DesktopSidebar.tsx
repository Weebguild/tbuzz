import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Search } from "lucide-react";
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

  const sizeTransform = useTransform(distance, [-120, 0, 120], [24, 40, 24]);
  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const iconSize = useTransform(size, (val) => val * 0.6);

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
                className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full"
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
  const navRefs = useRef(navItems.map(() => ({ current: null as HTMLDivElement | null })));
  const searchRef = useRef<HTMLDivElement>(null);

  const searchDistance = useTransform(mouseY, (val) => {
    const rect = searchRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - rect.y - rect.height / 2;
  });
  const searchSize = useSpring(
    useTransform(searchDistance, [-120, 0, 120], [24, 40, 24]),
    { mass: 0.1, stiffness: 150, damping: 12 }
  );
  const searchIconSize = useTransform(searchSize, (val) => val * 0.6);

  const isActive = (path: string) => {
    if (path === "/feed") return location.pathname === "/feed" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div
        className="w-[80px] border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-black/40 shrink-0 h-[100dvh] sticky top-0"
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <Link to="/feed" className="group">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:scale-110 transition-transform cursor-pointer relative overflow-hidden">
            <span className="text-3xl font-black text-white relative z-10" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>T</span>
          </div>
        </Link>
        <TooltipProvider delayDuration={200}>
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

          <div className="mt-auto mb-4">
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
