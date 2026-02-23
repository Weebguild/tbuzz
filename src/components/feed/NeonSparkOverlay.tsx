import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface NeonSparkOverlayProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Wraps any element and adds double-tap detection with a neon heart spark animation.
 * Single tap fires onSingleTap (if provided), double tap fires onDoubleTap + spark.
 */
export function NeonSparkOverlay({
  children,
  onDoubleTap,
  onSingleTap,
  disabled,
  className = "",
}: NeonSparkOverlayProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const tapTimer = useRef<number | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tapTimer.current) {
        // Double tap
        window.clearTimeout(tapTimer.current);
        tapTimer.current = null;

        const spark: Spark = { id: Date.now(), x, y };
        setSparks((prev) => [...prev, spark]);
        setTimeout(() => setSparks((prev) => prev.filter((s) => s.id !== spark.id)), 900);

        onDoubleTap();
      } else {
        // First tap – wait for possible second
        tapTimer.current = window.setTimeout(() => {
          tapTimer.current = null;
          onSingleTap?.();
        }, 250);
      }
    },
    [disabled, onDoubleTap, onSingleTap],
  );

  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      {children}

      {/* Spark overlay – pointer-events-none so it never blocks interaction */}
      <AnimatePresence>
        {sparks.map((spark) => (
          <motion.div
            key={spark.id}
            initial={{ scale: 0, opacity: 1, y: 0 }}
            animate={{
              scale: [0, 1.6, 1.2],
              opacity: [1, 1, 0],
              y: -50,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="absolute pointer-events-none z-50 flex items-center justify-center"
            style={{ left: spark.x, top: spark.y, transform: "translate(-50%, -50%)" }}
          >
            <Heart className="h-20 w-20 fill-accent text-accent drop-shadow-[0_0_30px_hsl(var(--accent))]" />
            {/* Radiating ring */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute rounded-full border-2 border-accent h-16 w-16"
              style={{ filter: "drop-shadow(0 0 12px hsl(var(--accent)))" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
