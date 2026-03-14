import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

export function DatingEntryCard() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const enter = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate("/dating/discover");
    }, 800);
  }, [navigate]);

  return (
    <>
      {/* The Entry Card — editorial style, warm tones */}
      <motion.button
        onClick={enter}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mb-4 relative overflow-hidden rounded-3xl text-left"
        style={{
          background: "linear-gradient(135deg, hsl(40, 33%, 96%) 0%, hsl(40, 20%, 93%) 100%)",
          boxShadow: "0 4px 24px -4px rgba(0,0,0,0.08)",
        }}
      >
        <div className="px-5 py-5 flex items-center gap-4">
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(25, 90%, 55%), hsl(340, 75%, 55%))",
              boxShadow: "0 4px 16px hsla(25, 90%, 50%, 0.3)",
            }}
          >
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-editorial text-lg leading-tight"
              style={{ color: "hsl(220, 20%, 18%)" }}
            >
              Spark
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "hsl(220, 10%, 50%)" }}
            >
              Campus dating, reimagined. Tap to enter.
            </p>
          </div>
          <div
            className="h-8 px-4 rounded-full flex items-center text-xs font-semibold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(25, 90%, 55%), hsl(340, 75%, 55%))" }}
          >
            Open
          </div>
        </div>
      </motion.button>

      {/* Full-screen transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Blur the main app */}
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ backdropFilter: "blur(0px)" }}
              animate={{ backdropFilter: "blur(20px)" }}
              transition={{ duration: 0.5 }}
            />
            {/* Ivory bloom expanding from center */}
            <motion.div
              className="absolute rounded-full"
              style={{ background: "hsl(40, 33%, 96%)" }}
              initial={{ width: 0, height: 0, opacity: 0.9 }}
              animate={{ width: "250vmax", height: "250vmax", opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Centered branding */}
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
