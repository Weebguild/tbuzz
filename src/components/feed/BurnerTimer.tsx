import { useState, useEffect } from "react";
import { Flame } from "lucide-react";

interface BurnerTimerProps {
  expiresAt: string;
}

export function BurnerTimer({ expiresAt }: BurnerTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        return;
      }
      setIsUrgent(diff <= 10000);
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-xs font-mono tracking-widest transition-all ${
        isUrgent
          ? "bg-red-500/20 border border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-[urgent-pulse_0.5s_ease-in-out_infinite]"
          : "bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
      }`}
    >
      <Flame className={`h-3 w-3 ${isUrgent ? "animate-bounce" : "animate-pulse"}`} />
      {timeLeft}
    </div>
  );
}
