import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Floating orb configuration
const FLOATING_ORBS = [
  { width: 128, height: 128, top: "15%", left: "10%", delay: 1 },
  { width: 80, height: 80, top: "25%", right: "15%", delay: 2 },
  { width: 160, height: 160, bottom: "20%", left: "20%", delay: 0.5 },
  { width: 96, height: 96, bottom: "30%", right: "25%", delay: 1.5 },
  { width: 64, height: 64, top: "40%", left: "5%", delay: 3 },
  { width: 112, height: 112, top: "10%", right: "30%", delay: 2.5 },
];

// Ring wave configuration
const RING_WAVES = [
  { delay: 0, color: "#a855f7" },
  { delay: 0.15, color: "#ec4899" },
  { delay: 0.3, color: "#a855f7" },
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Bubble physics - mouse interactive
  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    const tension = 0.08;
    const damping = 0.92;
    let velocityX = 0;
    let velocityY = 0;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) / 50;
      mouseY = (e.clientY - window.innerHeight / 2) / 50;
    };

    const updatePhysics = () => {
      const targetX = mouseX * 15;
      const targetY = mouseY * 15;

      const forceX = (targetX - currentX) * tension;
      const forceY = (targetY - currentY) * tension;

      velocityX += forceX;
      velocityY += forceY;

      velocityX *= damping;
      velocityY *= damping;

      currentX += velocityX;
      currentY += velocityY;

      const existingTransform = bubble.style.transform || "";
      bubble.style.transform = existingTransform.includes("translate")
        ? existingTransform.replace(/translate\([^)]+\)/, `translate(${currentX}px, ${currentY}px)`)
        : `translate(${currentX}px, ${currentY}px)`;

      rafId = requestAnimationFrame(updatePhysics);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Auto-complete after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Aurora Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60vmax] h-[60vmax] rounded-full"
          style={{ background: "hsl(263, 70%, 50%)", filter: "blur(80px)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-[-15%] right-[-10%] w-[50vmax] h-[50vmax] rounded-full"
          style={{ background: "hsl(330, 81%, 60%)", filter: "blur(80px)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: -4,
          }}
        />
      </div>

      {/* Floating Glass Orbs */}
      {FLOATING_ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.width,
            height: orb.height,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(8px)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {/* Central Bubble Container */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 280, height: 280 }}
      >
        {/* Ring Waves */}
        {RING_WAVES.map((ring, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${ring.color}` }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{
              duration: 2,
              delay: ring.delay,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Main Bubble with Physics */}
        <motion.div
          ref={bubbleRef}
          className="absolute inset-0 rounded-full"
          style={{
            background: "rgba(255, 255, 255, 0.015)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: `
              0 0 60px rgba(168, 85, 247, 0.4),
              0 0 120px rgba(236, 72, 153, 0.2),
              inset 0 0 60px rgba(168, 85, 247, 0.1)
            `,
            willChange: "transform",
          }}
          animate={{
            y: [0, -12, 0],
            x: [0, 6, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          {/* Inner gradient */}
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
          />

          {/* Highlight */}
          <div
            className="absolute inset-3 rounded-full opacity-40"
            style={{
              background: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.3) 0%, transparent 50%)",
            }}
          />

          {/* T Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.h1
              className="font-display text-[140px] leading-none select-none"
              style={{
                backgroundImage: "linear-gradient(135deg, #fff 0%, #c4b5fd 30%, #f9a8d4 70%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "'Bebas Neue', sans-serif",
              }}
              animate={{
                filter: [
                  "drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))",
                  "drop-shadow(0 0 40px rgba(236, 72, 153, 0.8))",
                  "drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              T
            </motion.h1>
          </div>

          {/* Shimmer Overlay */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-30 overflow-hidden"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            }}
            animate={{
              left: ["-150%", "200%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      </div>

      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.h2
          className="absolute text-2xl tracking-[0.4em] text-white/70 uppercase font-display"
          style={{ top: "calc(50% + 160px)", fontFamily: "'Bebas Neue', sans-serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          YOUR CAMPUS BUZZ
        </motion.h2>

        <motion.p
          className="absolute bottom-10 text-xs tracking-[0.5em] text-white/30 uppercase"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.3, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          CREATED BY SID AND MONTU
        </motion.p>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </motion.div>
  );
}
