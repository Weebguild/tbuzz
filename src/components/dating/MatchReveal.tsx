import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: string;
  ty: string;
  size: number;
  color: string;
  delay: number;
}

interface MatchRevealProps {
  matchedUser: {
    display_name: string;
    avatar_url: string | null;
  };
  currentUser: {
    display_name: string;
    avatar_url: string | null;
  };
  conversationId: string;
  onDismiss: () => void;
}

const COLORS = [
  "hsl(263, 70%, 55%)", // purple
  "hsl(330, 81%, 60%)", // pink
  "hsl(40, 90%, 65%)",  // gold
  "hsl(263, 70%, 70%)", // light purple
  "hsl(0, 0%, 100%)",   // white
];

export function MatchReveal({
  matchedUser,
  currentUser,
  conversationId,
  onDismiss,
}: MatchRevealProps) {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);
  const particleIdRef = useRef(0);

  // Generate burst particles on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.5;
        const distance = 100 + Math.random() * 200;
        newParticles.push({
          id: particleIdRef.current++,
          x: 0,
          y: 0,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          size: 4 + Math.random() * 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.3,
        });
      }
      setParticles(newParticles);
      setShowContent(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const goToMessages = useCallback(() => {
    onDismiss();
    navigate(`/messages/${conversationId}`);
  }, [navigate, conversationId, onDismiss]);

  const avatarFallback = (name: string) =>
    name?.charAt(0)?.toUpperCase() || "?";

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Warmly blurred backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "hsla(40, 33%, 96%, 0.95)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Particle burst from center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="match-particle"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              // CSS custom properties for the animation
              ["--tx" as string]: p.tx,
              ["--ty" as string]: p.ty,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8 px-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Avatars collide */}
            <div className="relative flex items-center justify-center h-32">
              {/* Left avatar */}
              <motion.div
                initial={{ x: -120, rotate: -15 }}
                animate={{ x: -20, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                  delay: 0.1,
                }}
                className="h-24 w-24 rounded-full overflow-hidden border-4 border-white relative z-10"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: "hsl(var(--sg-accent))",
                      color: "white",
                    }}
                  >
                    {avatarFallback(currentUser.display_name)}
                  </div>
                )}
              </motion.div>

              {/* Right avatar */}
              <motion.div
                initial={{ x: 120, rotate: 15 }}
                animate={{ x: 20, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                  delay: 0.1,
                }}
                className="h-24 w-24 rounded-full overflow-hidden border-4 border-white relative z-10"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}
              >
                {matchedUser.avatar_url ? (
                  <img
                    src={matchedUser.avatar_url}
                    alt={matchedUser.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: "hsl(330, 81%, 60%)",
                      color: "white",
                    }}
                  >
                    {avatarFallback(matchedUser.display_name)}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2
                className="font-editorial text-4xl mb-2"
                style={{ color: "hsl(220, 20%, 18%)" }}
              >
                It's a Match
              </h2>
              <p
                className="text-sm"
                style={{ color: "hsl(220, 10%, 50%)" }}
              >
                You and{" "}
                <span className="font-semibold" style={{ color: "hsl(var(--sg-accent))" }}>
                  {matchedUser.display_name}
                </span>{" "}
                liked each other
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-3 w-full max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={goToMessages}
                className="h-12 rounded-full text-white font-semibold text-sm tracking-wide transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, hsl(263, 70%, 50%), hsl(330, 81%, 60%))",
                  boxShadow: "0 4px 20px hsla(263, 70%, 50%, 0.3)",
                }}
              >
                Send a Message
              </button>
              <button
                onClick={onDismiss}
                className="h-12 rounded-full font-medium text-sm transition-opacity hover:opacity-70"
                style={{ color: "hsl(220, 10%, 50%)" }}
              >
                Keep Browsing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
