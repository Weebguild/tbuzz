import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Direction = "enter" | "exit";

interface DatingTransitionProps {
  direction: Direction;
  onComplete?: () => void;
}

// The visual overlay that plays during the transition
export function DatingTransitionOverlay({ direction, onComplete }: DatingTransitionProps) {
  const isEntering = direction === "enter";

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={onComplete}
    >
      {/* ── BACKGROUND LAYER ── */}
      {isEntering ? (
        // Entry: warm cream bloom expanding from center
        <motion.div
          className="absolute rounded-full"
          style={{ background: "linear-gradient(135deg, hsl(30, 30%, 98%) 0%, hsl(25, 25%, 95%) 100%)" }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: "240vmax", height: "240vmax", opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        // Exit: dark Tbuzz world reasserting
        <>
          <motion.div
            className="absolute inset-0 bg-[#050508]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          {/* Dark neon ripple on exit */}
          <motion.div
            className="absolute rounded-full"
            style={{ background: "radial-gradient(circle, hsla(263,70%,50%,0.15) 0%, transparent 70%)" }}
            initial={{ width: 0, height: 0 }}
            animate={{ width: "200vmax", height: "200vmax" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </>
      )}

      {/* ── FLOATING PETALS (entry only) ── */}
      {isEntering && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute dw-petal"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${Math.random() * 100}%`,
                width: `${10 + Math.random() * 18}px`,
                height: `${8 + Math.random() * 14}px`,
                background: i % 3 === 0
                  ? "hsla(340, 75%, 75%, 0.5)"
                  : i % 3 === 1
                  ? "hsla(30, 60%, 80%, 0.5)"
                  : "hsla(300, 40%, 85%, 0.4)",
                ["--px" as string]: `${(Math.random() - 0.5) * 300}px`,
                ["--py" as string]: `${(Math.random() - 0.5) * 300}px`,
                ["--pr" as string]: `${(Math.random() - 0.5) * 360}deg`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04, duration: 0.4 }}
            />
          ))}
        </div>
      )}

      {/* ── CENTER LOGO ── */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3"
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        transition={{ delay: 0.25, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {isEntering ? (
          // Entry: heart emblem
          <>
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(340, 75%, 58%), hsl(340, 70%, 48%))",
                boxShadow: "0 8px 32px hsla(340, 75%, 55%, 0.4)",
              }}
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ delay: 0.4, duration: 0.9, ease: "easeInOut" }}
            >
              <Heart className="w-7 h-7 text-white" fill="white" />
            </motion.div>
            <motion.span
              className="font-editorial text-xl tracking-wide"
              style={{ color: "hsl(220, 22%, 18%)" }}
            >
              dating
            </motion.span>
          </>
        ) : (
          // Exit: Tbuzz T logo
          <span
            className="text-[52px] font-black leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              backgroundImage: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            T
          </span>
        )}
      </motion.div>
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

    // Check if they've completed onboarding
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
      setTransitioning(null);
    }, 850);
  }, [navigate, user, transitioning]);

  const exitDating = useCallback(() => {
    if (transitioning) return;
    setTransitioning("exit");
    setTimeout(() => {
      navigate("/feed");
      setTransitioning(null);
    }, 750);
  }, [navigate, transitioning]);

  return { transitioning, enterDating, exitDating };
}
