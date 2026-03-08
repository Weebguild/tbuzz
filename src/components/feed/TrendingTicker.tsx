import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ChevronRight } from "lucide-react";

interface TrendingItem {
  id: string;
  gossip_alias: string;
  content: string;
  score: number; // Added to receive the hotness_score from Feed.tsx
}

interface TrendingTickerProps {
  items: TrendingItem[];
}

export function TrendingTicker({ items }: TrendingTickerProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    // Rotate every 4 seconds
    const interval = setInterval(advance, 4000);
    return () => clearInterval(interval);
  }, [advance, items.length]);

  if (items.length === 0) return null;

  const current = items[index];

  return (
    <div className="mb-6 group" onClick={() => navigate("/gossip")}>
      {/* ── HEADER WITH LIVE PULSING DOT ── */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          {/* Animated Ping Dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EC4899] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EC4899]"></span>
          </span>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-[#EC4899]" /> Hot Right Now
          </p>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors flex items-center">
          Tap to read <ChevronRight className="h-3 w-3 ml-0.5" />
        </span>
      </div>

      {/* ── THE TICKER CARD ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] border border-[#2D2D2D] p-4 cursor-pointer min-h-[85px] flex flex-col justify-center transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
        {/* Subtle Background Glow on Hover */}
        <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            // Vertical slide-up animation (Slot machine effect)
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -20,
              transition: { duration: 0.2, ease: "easeIn" },
            }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
                #{index + 1} Trending
              </span>
              <span className="text-xs font-bold text-foreground">{current.gossip_alias}</span>
              <span className="ml-auto text-[10px] font-bold text-[#EC4899] flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {(current.score * 100).toFixed(1)}°
              </span>
            </div>
            <p className="text-sm font-medium text-foreground/90 line-clamp-2 leading-relaxed italic">
              "{current.content}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
