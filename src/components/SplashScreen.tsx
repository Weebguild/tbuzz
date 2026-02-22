import { useState, useEffect } from "react";

export default function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 3000);
    const remove = setTimeout(() => onFinished(), 3400);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[400ms] ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ backgroundColor: "#0D0D0D" }}
    >
      {/* Orbiting dots + hexagon */}
      <div className="splash-hex-wrapper">
        <div className="splash-orbit-dot splash-orbit-dot-1" />
        <div className="splash-orbit-dot splash-orbit-dot-2" />
        <div className="splash-orbit-dot splash-orbit-dot-3" />
        <div className="splash-glow" />
        <div className="splash-hexagon">
          <div className="splash-hex-inner">
            <span className="splash-letter">T</span>
          </div>
        </div>
      </div>

      {/* Wordmark */}
      <div className="splash-wordmark">
        <span className="splash-campus">Campus</span>
        <span className="splash-divider" />
        <span className="splash-connect">CONNECT</span>
      </div>

      {/* Progress bar */}
      <div className="splash-progress-track">
        <div className="splash-progress-fill" />
      </div>
    </div>
  );
}
