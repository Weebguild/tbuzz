import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Direction = "enter" | "exit";

interface DatingTransitionProps {
  direction: Direction;
  onComplete?: () => void;
}

/* ── Ember particles for the entry ignite effect ── */
function EmberParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(18)].map((_, i) => {
        const x = 50 + (Math.random() - 0.5) * 40;
        const y = 50 + (Math.random() - 0.5) * 40;
        const size = 3 + Math.random() * 5;
        const delay = 0.1 + Math.random() * 0.4;
        const duration = 0.6 + Math.random() * 0.8;
        const driftX = (Math.random() - 0.5) * 120;
        const driftY = -(40 + Math.random() * 100);

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              background: i % 3 === 0
                ? "hsl(25, 95%, 60%)"
                : i % 3 === 1
                ? "hsl(35, 100%, 65%)"
                : "hsl(15, 90%, 55%)",
              boxShadow: `0 0 ${size * 2}px hsl(25, 95%, 55%)`,
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0.8, 0],
              scale: [0, 1.2, 0.8, 0],
              x: driftX,
              y: driftY,
            }}
            transition={{ delay, duration, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export function DatingTransitionOverlay({ direction, onComplete }: DatingTransitionProps) {
  const isEntering = direction === "enter";

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isEntering ? 0.15 : 0.4 }}
      onAnimationComplete={onComplete}
    >
      {isEntering ? (
        /* ═══ EMBER IGNITE ENTRY ═══ */
        <>
          <motion.div
            className="absolute inset-0"
            style={{ background: "hsl(15, 10%, 6%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(40, 100%, 75%) 0%, hsl(25, 95%, 55%) 40%, transparent 70%)",
            }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: "280vmax", height: "280vmax", opacity: 0.9 }}
            transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at center, hsl(35, 60%, 95%) 0%, hsl(30, 40%, 92%) 60%, hsl(25, 30%, 88%) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
          />
          <EmberParticles />
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(25, 90%, 55%), hsl(340, 75%, 55%))",
                boxShadow: "0 8px 32px hsla(25, 90%, 50%, 0.5), 0 0 60px hsla(25, 90%, 55%, 0.3)",
              }}
              animate={{
                boxShadow: [
                  "0 8px 32px hsla(25, 90%, 50%, 0.5), 0 0 60px hsla(25, 90%, 55%, 0.3)",
                  "0 8px 40px hsla(25, 90%, 50%, 0.7), 0 0 80px hsla(25, 90%, 55%, 0.5)",
                  "0 8px 32px hsla(25, 90%, 50%, 0.5), 0 0 60px hsla(25, 90%, 55%, 0.3)",
                ],
              }}
              transition={{ delay: 0.3, duration: 1.2, ease: "easeInOut" }}
            >
              <Flame className="w-7 h-7 text-white" />
            </motion.div>
            <motion.span
              className="font-editorial text-xl tracking-wide font-semibold"
              style={{ color: "hsl(15, 20%, 20%)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              Spark
            </motion.span>
          </motion.div>
        </>
      ) : (
        /* ═══ INK BLEED EXIT ═══ */
        <>
          {/* Ink bleeding in from all edges */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 0%, hsl(240, 10%, 6%) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />

          {/* Solid dark layer consuming everything */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "hsl(240, 10%, 4%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.35, ease: "easeIn" }}
          />

          {/* Fading warm light in center — last ember dying */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(30, 80%, 70%, 0.3) 0%, transparent 60%)",
              width: "40vmin",
              height: "40vmin",
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          />

          {/* T logo emerging from darkness */}
          <motion.div
            className="relative z-10 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span
              className="text-[56px] font-black leading-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                backgroundImage: "linear-gradient(180deg, hsl(0, 0%, 100%) 0%, hsla(0, 0%, 100%, 0.6) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px hsla(263, 70%, 50%, 0.4))",
              }}
            >
              T
            </span>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// Hook that drives transition from one world to the other
export function useDatingTransition() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transitioning, setTransitioning] = useState<Direction | null>(null);

  const enterDating = useCallback(async () => {
    if (transitioning) return;
    setTransitioning("enter");

    let target = "/dating/discover";
    try {
      if (user) {
        const { data } = await supabase
          .from("dating_profiles")
          .select("id, media, prompts")
          .eq("id", user.id)
          .maybeSingle();

        const hasMedia = data && Array.isArray(data.media) && (data.media as string[]).length > 0;
        const hasPrompts = data && data.prompts && Object.keys(data.prompts).length > 0;

        if (!hasMedia || !hasPrompts) {
          target = "/dating/onboarding";
        }
      }
    } catch (_) {}

    setTimeout(() => {
      navigate(target);
      // Let the overlay linger briefly after navigation so exit animation plays
      setTimeout(() => setTransitioning(null), 300);
    }, 850);
  }, [navigate, user, transitioning]);

  const exitDating = useCallback(() => {
    if (transitioning) return;
    setTransitioning("exit");
    // Navigate partway through the ink bleed, then clear after animation completes
    setTimeout(() => {
      navigate("/feed");
    }, 500);
    setTimeout(() => {
      setTransitioning(null);
    }, 1000);
  }, [navigate, transitioning]);

  return { transitioning, enterDating, exitDating };
}
