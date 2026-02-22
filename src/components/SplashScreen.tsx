import { useState, useEffect } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "tension" | "burst">("idle");
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Stage 1: Build tension
    const tensionTimer = setTimeout(() => setPhase("tension"), 1200);

    // Stage 2: Fluid Burst (reduced wait time for snappier feel)
    const burstTimer = setTimeout(() => {
      setPhase("burst");
      setTimeout(() => setIsFading(true), 150);
    }, 2700);

    const completeTimer = setTimeout(() => onComplete(), 3600);

    return () => {
      clearTimeout(tensionTimer);
      clearTimeout(burstTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col justify-center items-center overflow-hidden font-display transition-opacity duration-[800ms] ${isFading ? "opacity-0" : "opacity-100"}`}
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[40vmin] h-[40vmin] rounded-full bg-[#7C3AED] opacity-40 blur-[100px] animate-aurora-1" />
        <div className="absolute bottom-[20%] right-[20%] w-[50vmin] h-[50vmin] rounded-full bg-[#EC4899] opacity-30 blur-[100px] animate-aurora-2" />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center justify-center w-full h-full ${phase === "tension" ? "splash-tension" : ""} ${phase === "burst" ? "splash-burst" : ""}`}
      >
        {/* Centered Bubble Wrapper */}
        <div className="relative flex items-center justify-center w-40 h-40">
          <div className="shockwave absolute inset-0 rounded-full border-4 border-[#7C3AED] opacity-0 scale-50" />

          <div className="glass-bubble absolute inset-0 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/15 shadow-2xl animate-[float_4s_ease-in-out_infinite]">
            {/* The 'T' - Cleaned up centering */}
            <h1 className="logo-text text-8xl font-normal leading-none bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent flex items-center justify-center">
              T
            </h1>
          </div>
        </div>

        {/* Spaced Text Elements */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h2 className="splash-tagline splash-text mt-[240px] text-2xl tracking-[0.3em] text-white/80 uppercase">
            YOUR CAMPUS BUZZ
          </h2>
          <p className="splash-credits splash-text mt-auto mb-12 text-sm tracking-[0.4em] text-white/40 uppercase">
            CREATED BY SID AND MONTU
          </p>
        </div>
      </div>
    </div>
  );
}
