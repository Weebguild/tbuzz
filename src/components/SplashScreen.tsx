import { useState, useEffect } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "tension" | "burst">("idle");
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Stage 1: Wait 1.5s then start realistic tremors
    const tensionTimer = setTimeout(() => setPhase("tension"), 1500);

    // Stage 2: Trigger the burst exactly 1.5s after tremors begin
    const burstTimer = setTimeout(() => {
      setPhase("burst");
      // Subtle delay before the final screen fade-out
      setTimeout(() => setIsFading(true), 100);
    }, 3000);

    // Stage 3: Fully unmount after 3.9s total
    const completeTimer = setTimeout(() => onComplete(), 3900);

    return () => {
      clearTimeout(tensionTimer);
      clearTimeout(burstTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex justify-center items-center overflow-hidden font-display transition-opacity duration-[800ms] ${isFading ? "opacity-0" : "opacity-100"}`}
    >
      {/* Background Aurora Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[40vmin] h-[40vmin] rounded-full bg-[#7C3AED] opacity-40 blur-[100px] animate-aurora-1" />
        <div className="absolute bottom-[20%] right-[20%] w-[50vmin] h-[50vmin] rounded-full bg-[#EC4899] opacity-30 blur-[100px] animate-aurora-2" />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center w-full h-full justify-center ${phase === "tension" ? "splash-tension" : ""} ${phase === "burst" ? "splash-burst" : ""}`}
      >
        {/* The Glass Bubble & Logo */}
        <div className="relative flex justify-center items-center">
          <div className="shockwave absolute w-[150px] h-[150px] rounded-full border-4 border-[#7C3AED] opacity-0 scale-50" />
          <div className="glass-bubble relative w-[140px] h-[140px] rounded-full flex justify-center items-center bg-white/5 backdrop-blur-md border border-white/15 shadow-xl animate-[float_4s_ease-in-out_infinite]">
            <h1 className="logo-text text-8xl tracking-widest bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
              T
            </h1>
          </div>
        </div>

        {/* Animated Text Elements */}
        <h2 className="splash-tagline splash-text absolute top-[calc(50%+120px)] text-2xl tracking-[8px] text-white/70 uppercase">
          YOUR CAMPUS BUZZ
        </h2>
        <p className="splash-credits splash-text absolute bottom-10 text-sm tracking-[4px] text-white/40 uppercase">
          CREATED BY SID AND MONTU
        </p>
      </div>
    </div>
  );
}
