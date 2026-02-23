import { useState, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const PARTICLES = [
  { id: 0, angle: 0, distance: 160, size: 6, delay: 0, color: "#EC4899" },
  { id: 1, angle: 45, distance: 130, size: 4, delay: 0.02, color: "#7C3AED" },
  { id: 2, angle: 90, distance: 180, size: 5, delay: 0.01, color: "#ffffff" },
  { id: 3, angle: 135, distance: 150, size: 7, delay: 0.03, color: "#EC4899" },
  { id: 4, angle: 180, distance: 170, size: 4, delay: 0.02, color: "#7C3AED" },
  { id: 5, angle: 225, distance: 140, size: 6, delay: 0.01, color: "#ffffff" },
  { id: 6, angle: 270, distance: 190, size: 5, delay: 0.03, color: "#EC4899" },
  { id: 7, angle: 315, distance: 155, size: 7, delay: 0.02, color: "#7C3AED" },
];

const SPARKS = [
  { id: 0, angle: 20, distance: 100, delay: 0.0 },
  { id: 1, angle: 65, distance: 130, delay: 0.02 },
  { id: 2, angle: 110, distance: 90, delay: 0.04 },
  { id: 3, angle: 155, distance: 150, delay: 0.01 },
  { id: 4, angle: 200, distance: 110, delay: 0.03 },
  { id: 5, angle: 245, distance: 140, delay: 0.02 },
  { id: 6, angle: 290, distance: 120, delay: 0.04 },
  { id: 7, angle: 335, distance: 160, delay: 0.01 },
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "tension" | "burst">("idle");
  const [isFading, setIsFading] = useState(false);
  const bubbleControls = useAnimation();

  useEffect(() => {
    if (phase === "idle") {
      bubbleControls.start({
        y: [0, -8, 0],
        x: [0, 3, 0],
        transition: { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" as const },
      });
    }
  }, [phase, bubbleControls]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("tension"), 500);
    const t2 = setTimeout(() => setPhase("burst"), 1200);
    const t3 = setTimeout(() => setIsFading(true), 1350);
    const t4 = setTimeout(() => onComplete(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "tension") return;
    let start: number | null = null;
    let rafId: number;
    const totalMs = 700;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / totalMs, 1);
      const amp = 0.3 + Math.pow(progress, 2.5) * 10;
      const freq = 22 + progress * 30;
      const t = elapsed / 1000;
      bubbleControls.set({
        x: Math.sin(t * freq) * amp,
        y: Math.cos(t * freq * 0.7) * amp * 0.7,
        rotate: Math.sin(t * freq * 0.5) * progress * 2.5,
        scale: 1 + progress * 0.06,
      });
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
      transition={{ duration: 0.55, ease: "easeInOut" }}
    >
      {/* Aurora orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-[20%] left-[25%] w-[45vmin] h-[45vmin] rounded-full bg-[#7C3AED] blur-[110px]"
          animate={
            isBurst
              ? { opacity: 0, scale: 3, transition: { duration: 0.5, ease: "easeOut" } }
              : phase === "tension"
                ? { opacity: [0.35, 0.55, 0.35], scale: [1, 1.15, 1] }
                : { opacity: 0.35, scale: 1 }
          }
          transition={phase === "tension" ? { duration: 0.7, repeat: Infinity, repeatType: "mirror" } : undefined}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-[55vmin] h-[55vmin] rounded-full bg-[#EC4899] blur-[120px]"
          animate={
            isBurst
              ? { opacity: 0, scale: 3.5, transition: { duration: 0.55, ease: "easeOut" } }
              : phase === "tension"
                ? { opacity: [0.25, 0.45, 0.25], scale: [1, 1.1, 1] }
                : { opacity: 0.25, scale: 1 }
          }
          transition={phase === "tension" ? { duration: 0.8, repeat: Infinity, repeatType: "mirror", delay: 0.15 } : undefined}
        />
      </div>

      {/* Central stage */}
      <div className="relative flex items-center justify-center w-48 h-48">
        <AnimatePresence>
          {isBurst && (
            <>
              {/* Two shockwave rings */}
              {[
                { delay: 0.0, color: "#7C3AED", maxScale: 6 },
                { delay: 0.08, color: "#EC4899", maxScale: 8 },
              ].map((ring, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${ring.color}` }}
                  initial={{ scale: 0.6, opacity: 0.85 }}
                  animate={{ scale: ring.maxScale, opacity: 0, borderWidth: "0px" }}
                  transition={{ duration: 0.6, delay: ring.delay, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}

              {/* Debris */}
              {PARTICLES.map((p) => {
                const rad = (p.angle * Math.PI) / 180;
                return (
                  <motion.div
                    key={"p" + p.id}
                    className="absolute rounded-full"
                    style={{
                      width: p.size, height: p.size, background: p.color,
                      top: "50%", left: "50%",
                      marginTop: -p.size / 2, marginLeft: -p.size / 2,
                      boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(rad) * p.distance, y: Math.sin(rad) * p.distance, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.5, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
                  />
                );
              })}

              {/* Sparks */}
              {SPARKS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                return (
                  <motion.div
                    key={"s" + s.id}
                    className="absolute"
                    style={{
                      width: 1.5, height: 8,
                      background: "linear-gradient(to bottom, #ffffff, transparent)",
                      top: "50%", left: "50%",
                      marginTop: -4, marginLeft: -0.75,
                      rotate: `${s.angle + 90}deg`, transformOrigin: "top center",
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scaleY: 1 }}
                    animate={{ x: Math.cos(rad) * s.distance * 0.5, y: Math.sin(rad) * s.distance * 0.5, opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.35, delay: s.delay, ease: "easeOut" }}
                  />
                );
              })}

              {/* Flash */}
              <motion.div
                className="absolute inset-[-50%] rounded-full bg-white"
                initial={{ opacity: 0.9, scale: 0.4 }}
                animate={{ opacity: 0, scale: 3 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <AnimatePresence>
          {!isBurst && (
            <motion.div
              key="bubble"
              animate={bubbleControls}
              exit={{
                scale: [1.06, 1.5, 0],
                scaleX: [1, 0.8, 0],
                opacity: [1, 1, 0],
                transition: { duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] },
              }}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/15"
              style={{ willChange: "transform" }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={
                  phase === "tension"
                    ? { boxShadow: [
                        "0 0 20px rgba(124,58,237,0.15), inset 0 0 20px rgba(124,58,237,0.1)",
                        "0 0 80px rgba(236,72,153,0.7), inset 0 0 80px rgba(124,58,237,0.9)",
                      ] }
                    : { boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 0 20px rgba(124,58,237,0.1)" }
                }
                transition={phase === "tension" ? { duration: 0.7, ease: "easeIn" } : {}}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ background: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.22) 0%, transparent 55%)" }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
              />
              <motion.h1
                className="relative z-10 text-8xl font-normal leading-none select-none"
                style={{
                  backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #f9a8d4 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}
                animate={
                  phase === "tension"
                    ? { filter: ["drop-shadow(0 0 4px #7C3AED)", "drop-shadow(0 0 20px #EC4899)"] }
                    : { filter: "drop-shadow(0 0 0px transparent)" }
                }
                transition={phase === "tension" ? { duration: 0.7, ease: "easeIn" } : {}}
              >
                T
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.h2
          className="absolute text-2xl tracking-[0.3em] text-white/80 uppercase"
          style={{ top: "calc(50% + 120px)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={
            !isBurst ? { opacity: 0.8, y: 0 } : { opacity: 0, letterSpacing: "1.5em", y: 20, filter: "blur(6px)" }
          }
          transition={!isBurst ? { delay: 0.2, duration: 0.35 } : { duration: 0.3, ease: "easeIn" }}
        >
          YOUR CAMPUS BUZZ
        </motion.h2>
        <motion.p
          className="absolute bottom-12 text-sm tracking-[0.4em] text-white/40 uppercase"
          initial={{ opacity: 0, y: 6 }}
          animate={
            !isBurst ? { opacity: 0.4, y: 0 } : { opacity: 0, letterSpacing: "1.2em", y: 15, filter: "blur(4px)" }
          }
          transition={!isBurst ? { delay: 0.3, duration: 0.35 } : { duration: 0.25, ease: "easeIn" }}
        >
          CREATED BY SID AND MONTU
        </motion.p>
      </div>
    </motion.div>
  );
}
