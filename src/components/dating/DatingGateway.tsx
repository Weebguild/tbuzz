import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

interface DatingGatewayProps {
  children: React.ReactNode;
}

export function DatingGateway({ children }: DatingGatewayProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  const enterDating = useCallback(() => {
    setIsTransitioning(true);
    // Let the animation play, then navigate
    setTimeout(() => {
      navigate("/dating/discover");
    }, 800);
  }, [navigate]);

  return (
    <>
      {children}

      {/* The Gateway Button — rendered by the parent page */}
      {/* The transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Blurred backdrop of the main app */}
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ backdropFilter: "blur(0px)" }}
              animate={{ backdropFilter: "blur(20px)" }}
              transition={{ duration: 0.6 }}
            />

            {/* The "bloom" — warm ivory circle expanding */}
            <motion.div
              className="absolute rounded-full"
              style={{ background: "hsl(40, 33%, 96%)" }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{
                width: "200vmax",
                height: "200vmax",
                opacity: 1,
              }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* Center logo during transition */}
            <motion.div
              className="relative z-10 flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Heart
                className="h-8 w-8"
                style={{ color: "hsl(263, 70%, 50%)" }}
                fill="hsl(263, 70%, 50%)"
              />
              <span
                className="font-editorial text-2xl tracking-tight"
                style={{ color: "hsl(220, 20%, 18%)" }}
              >
                Sunlit Gallery
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function useDatingGateway() {
  const navigate = useNavigate();

  const enterDating = useCallback(() => {
    // We dispatch a custom event the gateway listens to
    window.dispatchEvent(new CustomEvent("enter-dating"));
    // Fallback: direct navigate after a delay
    setTimeout(() => navigate("/dating/discover"), 800);
  }, [navigate]);

  return { enterDating };
}
