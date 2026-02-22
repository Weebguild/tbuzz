import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

interface TrendingItem {
  id: string;
  gossip_alias: string;
  content: string;
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
    const interval = setInterval(advance, 4000);
    return () => clearInterval(interval);
  }, [advance, items.length]);

  if (items.length === 0) return null;

  const current = items[index];

  return (
    <div className="mb-5">
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Flame className="h-3.5 w-3.5" /> Trending on Campus
      </p>
      <div
        className="rounded-xl p-3 border border-border/50 backdrop-blur-sm cursor-pointer min-h-[60px]"
        style={{ background: "rgba(255,255,255,0.03)" }}
        onClick={() => navigate("/gossip")}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, filter: "blur(8px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{
              opacity: 0,
              filter: "blur(12px)",
              scale: 1.05,
              transition: { duration: 0.5 },
            }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold text-primary mb-1">{current.gossip_alias}</p>
            <p className="text-sm text-foreground/80 truncate">{current.content}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
