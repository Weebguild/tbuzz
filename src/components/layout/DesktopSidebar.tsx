import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Mail, User, Search } from "lucide-react";
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
  const isDating = location.pathname.startsWith("/dating");
  const { transitioning, enterDating, exitDating } = useDatingTransition();

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
        className="w-[80px] border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-black/40 shrink-0 h-[100dvh] sticky top-0 relative z-30 overflow-visible"
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => isDating ? exitDating() : enterDating()}
              className="group"
            >
              <div className="h-12 w-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center cursor-pointer relative transition-all duration-300 group-hover:scale-110 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isDating ? "heart" : "T"}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[28px] font-black relative z-10 leading-none"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      backgroundImage: isDating
                        ? "linear-gradient(180deg, #f472b6 0%, #ec4899 100%)"
                        : "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {isDating ? "♥" : "T"}
                  </motion.span>
                </AnimatePresence>
                <span className="absolute bottom-[7px] right-[7px] w-[5px] h-[5px] rounded-full bg-primary" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="z-[9999] bg-black/80 backdrop-blur-xl border-white/10 text-white font-bold text-xs">
            {isDating ? "Back to Tbuzz" : "Dating"}
          </TooltipContent>
        </Tooltip>
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
      <AnimatePresence>
        {transitioning && <DatingTransitionOverlay direction={transitioning} />}
      </AnimatePresence>
    </>
  );
}
