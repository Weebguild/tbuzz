import { Link, useLocation } from "react-router-dom";
import { Compass, Heart, User } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/ship/discover", icon: Compass, label: "Discover" },
  { path: "/ship/matches", icon: Heart, label: "Matches" },
  { path: "/ship/profile", icon: User, label: "Profile" },
];

const ShipBottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        height: "var(--ship-nav-height)",
        background: "rgba(13,13,26,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 py-2 px-4">
            <motion.div whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1">
              <item.icon
                className="h-6 w-6 transition-colors duration-200"
                style={{
                  color: isActive ? "var(--ship-violet)" : "rgba(255,255,255,0.4)",
                  filter: isActive ? "drop-shadow(0 0 8px var(--ship-violet-glow))" : "none",
                }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? "var(--ship-violet)" : "rgba(255,255,255,0.35)" }}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="ship-nav-dot"
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: "var(--ship-violet)",
                    boxShadow: "0 0 8px var(--ship-violet-glow)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
};

export default ShipBottomNav;
