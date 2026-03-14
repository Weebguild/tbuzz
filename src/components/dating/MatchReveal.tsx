import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, ChevronRight } from "lucide-react";

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

interface Petal {
  id: number;
  px: string; py: string; pr: string;
  size: number;
  color: string;
  left: string;
  top: string;
  delay: number;
}

interface MatchRevealProps {
  matchedUser: { display_name: string; avatar_url: string | null };
  currentUser: { display_name: string; avatar_url: string | null };
  conversationId: string;
  onDismiss: () => void;
}

const ROSE_PALETTE = [
  "hsl(340, 75%, 75%)", "hsl(340, 70%, 82%)", "hsl(30, 60%, 85%)",
  "hsl(300, 40%, 80%)", "hsl(0, 0%, 100%)", "hsl(340, 75%, 65%)",
];

export function MatchReveal({ matchedUser, currentUser, conversationId, onDismiss }: MatchRevealProps) {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [petals, setPetals] = useState<Petal[]>([]);
  const [showContent, setShowContent] = useState(false);
  const particleIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      // Particle burst
      const newParticles: Particle[] = Array.from({ length: 36 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.4;
        const dist = 80 + Math.random() * 160;
        return {
          id: particleIdRef.current++,
          x: 0, y: 0,
          tx: `${Math.cos(angle) * dist}px`,
          ty: `${Math.sin(angle) * dist}px`,
          size: 4 + Math.random() * 8,
          color: ROSE_PALETTE[Math.floor(Math.random() * ROSE_PALETTE.length)],
          delay: Math.random() * 0.3,
        };
      });
      setParticles(newParticles);

      // Petal drift
      const newPetals: Petal[] = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        px: `${(Math.random() - 0.5) * 350}px`,
        py: `${(Math.random() - 0.5) * 400}px`,
        pr: `${(Math.random() - 0.5) * 540}deg`,
        size: 12 + Math.random() * 20,
        color: i % 3 === 0 ? "hsla(340,75%,75%,0.6)" : i % 3 === 1 ? "hsla(30,60%,82%,0.55)" : "hsla(300,40%,80%,0.5)",
        left: `${10 + Math.random() * 80}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 0.5,
      }));
      setPetals(newPetals);
      setShowContent(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const goToMessages = () => { onDismiss(); navigate(`/messages/${conversationId}`); };
  const fallback = (name: string) => name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      /* Background — Deep Liquid Obsidian */
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ background: "#080808", backgroundSize: "cover" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/5" />

      {/* Particle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="match-particle"
            style={{
              width: p.size, height: p.size,
              background: p.color,
              ["--tx" as string]: p.tx,
              ["--ty" as string]: p.ty,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Petal drift */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {petals.map(p => (
          <div
            key={p.id}
            className="dw-petal"
            style={{
              width: p.size, height: p.size,
              background: p.color,
              left: p.left, top: p.top,
              ["--px" as string]: p.px,
              ["--py" as string]: p.py,
              ["--pr" as string]: p.pr,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Avatars colliding */}
            <div className="relative flex items-center justify-center" style={{ height: "120px", width: "220px" }}>
              {/* Current user */}
              <motion.div
                initial={{ x: -130, rotate: -12 }}
                animate={{ x: -28, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
                className="absolute w-24 h-24 rounded-full overflow-hidden"
                style={{
                  border: "3px solid white",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  zIndex: 10,
                }}
              >
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt={currentUser.display_name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: "linear-gradient(135deg, hsl(340,75%,58%), hsl(340,70%,46%))" }}>
                      {fallback(currentUser.display_name)}
                    </div>
                  )
                }
              </motion.div>

              {/* Heart in the center */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 14 }}
                className="absolute z-20 w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(340,75%,58%), hsl(340,70%,46%))",
                  boxShadow: "0 4px 16px hsla(340,75%,55%,0.5)",
                }}
              >
                <Heart className="w-4 h-4 text-white" fill="white" />
              </motion.div>

              {/* Matched user */}
              <motion.div
                initial={{ x: 130, rotate: 12 }}
                animate={{ x: 28, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
                className="absolute w-24 h-24 rounded-full overflow-hidden"
                style={{
                  border: "3px solid white",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  zIndex: 10,
                }}
              >
                {matchedUser.avatar_url
                  ? <img src={matchedUser.avatar_url} alt={matchedUser.display_name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: "linear-gradient(135deg, hsl(263,70%,55%), hsl(263,70%,45%))" }}>
                      {fallback(matchedUser.display_name)}
                    </div>
                  )
                }
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2
                className="font-editorial mb-2"
                style={{ fontSize: "clamp(2rem, 8vw, 3rem)", color: "white" }}
              >
                It's a Match
              </h2>
              <p className="text-sm" style={{ color: "white/60" }}>
                You and{" "}
                <span className="font-semibold" style={{ color: "hsl(var(--dw-accent))" }}>
                  {matchedUser.display_name}
                </span>{" "}
                liked each other
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="flex flex-col gap-3 w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={goToMessages}
                className="dw-btn-liquid h-14 flex items-center justify-center gap-2 text-sm font-bold rounded-full"
              >
                <MessageCircle className="w-5 h-5" />
                Send a Message
              </button>
              <button
                onClick={onDismiss}
                className="h-12 rounded-full font-medium text-sm transition-all hover:bg-white/5"
                style={{ color: "white/50" }}
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
