import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface HeartBurstProps {
  show: boolean;
  onComplete?: () => void;
}

const particles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  angle: (i * 60) + Math.random() * 30 - 15,
  distance: 20 + Math.random() * 25,
  scale: 0.4 + Math.random() * 0.4,
  delay: Math.random() * 0.1,
}));

export function HeartBurst({ show, onComplete }: HeartBurstProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [0, p.scale, p.scale * 0.6],
                  x: tx,
                  y: ty - 10,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.6,
                  delay: p.delay,
                  ease: "easeOut",
                }}
                onAnimationComplete={() => {
                  if (p.id === 0) onComplete?.();
                }}
                className="absolute"
              >
                <Heart className="h-3 w-3 fill-primary text-primary" />
              </motion.div>
            );
          })}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
