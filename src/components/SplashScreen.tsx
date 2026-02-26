import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Floating orbs
const FLOATING_ORBS = [
  { width: 128, height: 128, top: "15%", left: "10%", delay: 1 },
  { width: 80, height: 80, top: "25%", right: "15%", delay: 2 },
  { width: 160, height: 160, bottom: "20%", left: "20%", delay: 0.5 },
  { width: 96, height: 96, bottom: "30%", right: "25%", delay: 1.5 },
  { width: 64, height: 64, top: "40%", left: "5%", delay: 3 },
  { width: 112, height: 112, top: "10%", right: "30%", delay: 2.5 },
];

// Ring waves
const RING_WAVES = [
  { delay: 0, color: "rgb(168, 85, 247)" },
  { delay: 0.15, color: "rgb(236, 72, 153)" },
  { delay: 0.3, color: "rgb(168, 85, 247)" },
];

// Particle burst - 20 particles
const PARTICLES = Array.from({ length: 20 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 20;
  const distance = 100 + Math.random() * 60;
  const colors = ['#a855f7', '#ec4899', '#c4b5fd', '#f9a8d4', '#ffffff'];
  return {
    angle,
    distance,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: 1500 + Math.random() * 1000,
    delay: Math.random() * 0.5,
  };
});

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Bubble physics
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

      bubble.style.transform = `translate(${currentX}px, ${currentY}px)`;
      
      rafId = requestAnimationFrame(updatePhysics);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

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
      {/* Aurora Background */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: "-20%",
          left: "-10%",
          width: "60vmax",
          height: "60vmax",
          background: "hsl(263, 70%, 50%)",
          filter: "blur(80px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          bottom: "-15%",
          right: "-10%",
          width: "50vmax",
          height: "50vmax",
          background: "hsl(330, 81%, 60%)",
          filter: "blur(80px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: -4,
        }}
      />

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
            style={{ 
              border: `2px solid ${ring.color}`,
              borderWidth: "2px",
            }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0, borderWidth: "0px" }}
            transition={{
              duration: 2,
              delay: ring.delay,
              ease: "easeOut",
            }}
          />
        ))}

        {/* PARTICLE BURST - from HTML preview */}
        {PARTICLES.map((p, i) => {
          const x = Math.cos(p.angle) * p.distance;
          const y = Math.sin(p.angle) * p.distance;
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                left: "50%",
                top: "50%",
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x, y, opacity: 0, scale: 0 }}
              transition={{
                duration: p.duration / 1000,
                delay: p.delay,
                ease: [0.25, 1, 0.5, 1],
              }}
            />
          );
        })}

        {/* Main Bubble */}
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
            className="absolute rounded-full"
            style={{
              inset: "8px",
              background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
          />

          {/* Highlight */}
          <div
            className="absolute rounded-full opacity-40"
            style={{
              inset: "12px",
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
            className="absolute rounded-full opacity-30 overflow-hidden"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
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
          style={{ 
            top: "calc(50% + 160px)", 
            fontFamily: "'Bebas Neue', sans-serif" 
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          YOUR CAMPUS BUZZ
        </motion.h2>

        <motion.p
          className="absolute text-xs tracking-[0.5em] text-white/30 uppercase"
          style={{ bottom: "40px" }}
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
