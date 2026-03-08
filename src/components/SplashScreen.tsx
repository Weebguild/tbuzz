import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiquidBackground } from "./LiquidBackground";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "sustain" | "exit">("enter");

  useEffect(() => {
    const sustainTimer = setTimeout(() => {
      setPhase("sustain");
    }, 500);

    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 2500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(sustainTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Interactive WebGL Liquid Background */}
          <LiquidBackground isPlaying={true} />

          {/* Foreground Typography */}
          <div className="relative z-10 flex flex-col items-center pointer-events-none px-4 text-center">

            <motion.div
              initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                className="font-display text-white select-none leading-[0.8] tracking-widest text-[120px] md:text-[200px]"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  backgroundImage: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 20px 40px rgba(0,0,0,0.8)",
                  mixBlendMode: "overlay"
                }}
              >
                TBUZZ
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, letterSpacing: "1em", y: 10 }}
              animate={phase === "sustain" ? {
                opacity: 1,
                letterSpacing: "0.4em",
                y: 0
              } : { opacity: 0, letterSpacing: "1em", y: 10 }}
              transition={{ delay: 0.2, duration: 1.2, ease: "easeOut" }}
              className="mt-4 md:mt-0"
            >
              <h2 className="text-white/80 font-sans tracking-[0.4em] text-sm md:text-xl font-bold uppercase backdrop-blur-sm bg-black/10 px-6 py-2 rounded-full border border-white/10">
                Your Campus Buzz
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="absolute -bottom-32 text-[10px] md:text-xs tracking-[0.5em] text-white/50 uppercase font-sans font-semibold"
            >
              Created by Sid and Montu
            </motion.p>
          </div>

          {/* Vignette entirely focused on edges to let center liquid bleed through */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: "radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.9) 100%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
