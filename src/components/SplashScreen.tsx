import { useState, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// Fixed particle data (no Math.random() at module level to avoid hydration issues)
const PARTICLES = [
  { id: 0, angle: 0, distance: 180, size: 8, delay: 0.02, color: "#EC4899" },
  { id: 1, angle: 20, distance: 145, size: 5, delay: 0.07, color: "#7C3AED" },
  { id: 2, angle: 40, distance: 220, size: 4, delay: 0.01, color: "#ffffff" },
  { id: 3, angle: 60, distance: 160, size: 9, delay: 0.05, color: "#EC4899" },
  { id: 4, angle: 80, distance: 200, size: 4, delay: 0.08, color: "#7C3AED" },
  { id: 5, angle: 100, distance: 175, size: 6, delay: 0.03, color: "#ffffff" },
  { id: 6, angle: 120, distance: 195, size: 8, delay: 0.06, color: "#EC4899" },
  { id: 7, angle: 140, distance: 150, size: 4, delay: 0.04, color: "#7C3AED" },
  { id: 8, angle: 160, distance: 210, size: 5, delay: 0.07, color: "#ffffff" },
  { id: 9, angle: 180, distance: 165, size: 9, delay: 0.02, color: "#EC4899" },
  { id: 10, angle: 200, distance: 185, size: 4, delay: 0.05, color: "#7C3AED" },
  { id: 11, angle: 220, distance: 230, size: 7, delay: 0.01, color: "#ffffff" },
  { id: 12, angle: 240, distance: 155, size: 5, delay: 0.08, color: "#EC4899" },
  { id: 13, angle: 260, distance: 200, size: 9, delay: 0.03, color: "#7C3AED" },
  { id: 14, angle: 280, distance: 170, size: 4, delay: 0.06, color: "#ffffff" },
  { id: 15, angle: 300, distance: 215, size: 6, delay: 0.04, color: "#EC4899" },
  { id: 16, angle: 320, distance: 145, size: 8, delay: 0.07, color: "#7C3AED" },
  { id: 17, angle: 340, distance: 190, size: 5, delay: 0.02, color: "#ffffff" },
];

const SPARKS = [
  { id: 0, angle: 12, distance: 88, delay: 0.0 },
  { id: 1, angle: 25, distance: 116, delay: 0.03 },
  { id: 2, angle: 38, distance: 144, delay: 0.06 },
  { id: 3, angle: 51, distance: 172, delay: 0.09 },
  { id: 4, angle: 64, distance: 200, delay: 0.12 },
  { id: 5, angle: 77, distance: 228, delay: 0.0 },
  { id: 6, angle: 90, distance: 88, delay: 0.03 },
  { id: 7, angle: 103, distance: 116, delay: 0.06 },
  { id: 8, angle: 116, distance: 144, delay: 0.09 },
  { id: 9, angle: 129, distance: 172, delay: 0.12 },
  { id: 10, angle: 142, distance: 200, delay: 0.0 },
  { id: 11, angle: 155, distance: 228, delay: 0.03 },
  { id: 12, angle: 168, distance: 88, delay: 0.06 },
  { id: 13, angle: 181, distance: 116, delay: 0.09 },
  { id: 14, angle: 194, distance: 144, delay: 0.12 },
  { id: 15, angle: 207, distance: 172, delay: 0.0 },
  { id: 16, angle: 220, distance: 200, delay: 0.03 },
  { id: 17, angle: 233, distance: 228, delay: 0.06 },
  { id: 18, angle: 246, distance: 88, delay: 0.09 },
  { id: 19, angle: 259, distance: 116, delay: 0.12 },
  { id: 20, angle: 272, distance: 144, delay: 0.0 },
  { id: 21, angle: 285, distance: 172, delay: 0.03 },
  { id: 22, angle: 298, distance: 200, delay: 0.06 },
  { id: 23, angle: 311, distance: 228, delay: 0.09 },
  { id: 24, angle: 324, distance: 88, delay: 0.12 },
  { id: 25, angle: 337, distance: 116, delay: 0.0 },
  { id: 26, angle: 350, distance: 144, delay: 0.03 },
  { id: 27, angle: 363, distance: 172, delay: 0.06 },
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "tension" | "burst">("idle");
  const [isFading, setIsFading] = useState(false);
  const bubbleControls = useAnimation();

  // Smooth idle float
  useEffect(() => {
    if (phase === "idle") {
      bubbleControls.start({
        y: [0, -12, -6, -18, -10, 0],
        x: [0, 3, -2, 4, -3, 0],
        transition: {
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror" as const,
        },
      });
    }
  }, [phase, bubbleControls]);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("tension"), 1100);
    const t2 = setTimeout(() => setPhase("burst"), 2700);
    const t3 = setTimeout(() => setIsFading(true), 2850);
    const t4 = setTimeout(() => onComplete(), 3700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  // RAF-driven escalating tremor — smooth, physics-based, not keyframe-stepped
  useEffect(() => {
    if (phase !== "tension") return;
    let start: number | null = null;
    let rafId: number;
    const totalMs = 1600;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / totalMs, 1);

      // Amplitude ramps exponentially: barely perceptible → violent shaking
      const amp = 0.5 + Math.pow(progress, 2.2) * 14;
      // Frequency increases over time so it feels like it's about to snap
      const freq = 18 + progress * 24;
      const t = elapsed / 1000;

      const x = Math.sin(t * freq) * amp;
      const y = Math.cos(t * freq * 0.7) * amp * 0.8;
      const rotate = Math.sin(t * freq * 0.5) * progress * 3;
      const scale = 1 + progress * 0.09;

      bubbleControls.set({ x, y, rotate, scale });
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, bubbleControls]);

  const isBurst = phase === "burst";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black flex flex-col justify-center items-center overflow-hidden font-display"
      animate={{ opacity: isFading ? 0 : 1 }}
      transition={{ duration: 0.85, ease: "easeInOut" }}
    >
      {/* Aurora background orbs — pulse during tension, explode on burst */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-[20%] left-[25%] w-[45vmin] h-[45vmin] rounded-full bg-[#7C3AED] blur-[110px]"
          animate={
            phase === "tension"
              ? { opacity: [0.35, 0.6, 0.35], scale: [1, 1.2, 1] }
              : isBurst
                ? { opacity: 0, scale: 3.5, transition: { duration: 0.7, ease: "easeOut" } }
                : { opacity: 0.35, scale: 1 }
          }
          transition={phase === "tension" ? { duration: 1.4, repeat: Infinity, repeatType: "mirror" } : undefined}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-[55vmin] h-[55vmin] rounded-full bg-[#EC4899] blur-[120px]"
          animate={
            phase === "tension"
              ? { opacity: [0.25, 0.5, 0.25], scale: [1, 1.15, 1] }
              : isBurst
                ? { opacity: 0, scale: 4.5, transition: { duration: 0.75, ease: "easeOut" } }
                : { opacity: 0.25, scale: 1 }
          }
          transition={
            phase === "tension" ? { duration: 1.8, repeat: Infinity, repeatType: "mirror", delay: 0.3 } : undefined
          }
        />
      </div>

      {/* Central stage */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* ── BURST EFFECTS ── */}
        <AnimatePresence>
          {isBurst && (
            <>
              {/* Three staggered shockwave rings */}
              {[
                { delay: 0.0, color: "#7C3AED", maxScale: 6 },
                { delay: 0.1, color: "#EC4899", maxScale: 7.5 },
                { delay: 0.22, color: "#7C3AED", maxScale: 9 },
              ].map((ring, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${ring.color}` }}
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: ring.maxScale, opacity: 0, borderWidth: "0px" }}
                  transition={{ duration: 0.85 + i * 0.15, delay: ring.delay, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}

              {/* Glowing debris orbs */}
              {PARTICLES.map((p) => {
                const rad = (p.angle * Math.PI) / 180;
                const tx = Math.cos(rad) * p.distance;
                const ty = Math.sin(rad) * p.distance;
                return (
                  <motion.div
                    key={"p" + p.id}
                    className="absolute rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      background: p.color,
                      top: "50%",
                      left: "50%",
                      marginTop: -p.size / 2,
                      marginLeft: -p.size / 2,
                      boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: tx, y: ty, opacity: 0, scale: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: p.delay,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                );
              })}

              {/* Thin spark streaks */}
              {SPARKS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const tx = Math.cos(rad) * s.distance;
                const ty = Math.sin(rad) * s.distance;
                return (
                  <motion.div
                    key={"s" + s.id}
                    className="absolute"
                    style={{
                      width: 1.5,
                      height: 9,
                      background: "linear-gradient(to bottom, #ffffff, transparent)",
                      top: "50%",
                      left: "50%",
                      marginTop: -4.5,
                      marginLeft: -0.75,
                      rotate: `${s.angle + 90}deg`,
                      transformOrigin: "top center",
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scaleY: 1 }}
                    animate={{ x: tx * 0.5, y: ty * 0.5, opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.5, delay: s.delay, ease: "easeOut" }}
                  />
                );
              })}

              {/* Central white flash */}
              <motion.div
                className="absolute inset-[-60%] rounded-full bg-white"
                initial={{ opacity: 0.95, scale: 0.4 }}
                animate={{ opacity: 0, scale: 3.5 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ── THE BUBBLE ── */}
        <AnimatePresence>
          {!isBurst && (
            <motion.div
              key="bubble"
              animate={bubbleControls}
              exit={{
                scale: [1.08, 1.65, 0],
                scaleX: [1, 0.78, 0],
                opacity: [1, 1, 0],
                transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] },
              }}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/15"
              style={{ willChange: "transform" }}
            >
              {/* Glow layer — escalates with pressure */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={
                  phase === "tension"
                    ? {
                        boxShadow: [
                          "0 0 20px rgba(124,58,237,0.15), inset 0 0 20px rgba(124,58,237,0.1)",
                          "0 0 100px rgba(236,72,153,0.8), inset 0 0 100px rgba(124,58,237,1)",
                        ],
                      }
                    : {
                        boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 0 20px rgba(124,58,237,0.1)",
                      }
                }
                transition={phase === "tension" ? { duration: 1.6, ease: "easeIn" } : {}}
              />

              {/* Specular highlight — makes it look like a real bubble */}
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{
                  background: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.22) 0%, transparent 55%)",
                }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
              />

              {/* The T — gradient + glowing on tension */}
              <motion.h1
                className="relative z-10 text-8xl font-normal leading-none select-none"
                style={{
                  backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #f9a8d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                animate={
                  phase === "tension"
                    ? {
                        filter: ["drop-shadow(0 0 4px #7C3AED)", "drop-shadow(0 0 24px #EC4899)"],
                      }
                    : { filter: "drop-shadow(0 0 0px transparent)" }
                }
                transition={phase === "tension" ? { duration: 1.6, ease: "easeIn" } : {}}
              >
                T
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TEXT ELEMENTS ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.h2
          className="absolute text-2xl tracking-[0.3em] text-white/80 uppercase"
          style={{ top: "calc(50% + 120px)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={
            phase === "idle" || phase === "tension"
              ? { opacity: 0.8, y: 0 }
              : { opacity: 0, letterSpacing: "1.8em", y: 30, filter: "blur(8px)" }
          }
          transition={
            phase === "idle"
              ? { delay: 0.4, duration: 0.6 }
              : phase === "burst"
                ? { duration: 0.45, ease: "easeIn" }
                : {}
          }
        >
          YOUR CAMPUS BUZZ
        </motion.h2>

        <motion.p
          className="absolute bottom-12 text-sm tracking-[0.4em] text-white/40 uppercase"
          initial={{ opacity: 0, y: 6 }}
          animate={
            phase === "idle" || phase === "tension"
              ? { opacity: 0.4, y: 0 }
              : { opacity: 0, letterSpacing: "1.6em", y: 20, filter: "blur(6px)" }
          }
          transition={
            phase === "idle"
              ? { delay: 0.7, duration: 0.6 }
              : phase === "burst"
                ? { duration: 0.4, ease: "easeIn" }
                : {}
          }
        >
          CREATED BY SID AND MONTU
        </motion.p>
      </div>
    </motion.div>
  );
}
