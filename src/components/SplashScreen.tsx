import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [showWordmark, setShowWordmark] = useState(false);

  useEffect(() => {
    const wordmarkTimer = setTimeout(() => setShowWordmark(true), 500);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    const fadeTimer = setTimeout(() => setFadeOut(true), 3000);
    const doneTimer = setTimeout(() => onComplete(), 3400);

    return () => {
      clearTimeout(wordmarkTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0D0D0D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes letter-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes spark-orbit {
          0%   { transform: rotate(0deg)   translateX(100px) scale(1);   opacity: 1; }
          50%  { transform: rotate(180deg) translateX(100px) scale(1.6); opacity: 0.5; }
          100% { transform: rotate(360deg) translateX(100px) scale(1);   opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .splash-hex-ring {
          position: absolute; inset: 0;
          background: conic-gradient(from 0deg, #7C3AED, #EC4899, #F59E0B, #7C3AED);
          clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
          animation: spin-ring 8s linear infinite;
        }
        .splash-hex-inner {
          position: absolute; inset: 6px;
          background: #0D0D0D;
          clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
          z-index: 1;
        }
        .splash-glow {
          position: absolute; width: 130px; height: 130px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%);
          z-index: 2;
          animation: pulse-glow 2.4s ease-in-out infinite;
        }
        .splash-letter {
          position: relative; z-index: 3;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 112px; line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #C4B5FD 40%, #EC4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 6px rgba(124,58,237,0.9)) drop-shadow(0 0 20px rgba(236,72,153,0.6));
          animation: letter-float 3s ease-in-out infinite;
        }
        .splash-spark {
          position: absolute; width: 4px; height: 4px;
          border-radius: 50%;
          animation: spark-orbit 4s linear infinite;
        }
        .splash-wordmark {
          animation: fade-in-up 0.5s ease forwards;
        }
        .splash-created {
          animation: fade-in-up 0.5s ease 0.8s both;
        }
      `}</style>

      {/* Logo Mark */}
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="splash-hex-ring" />
        <div className="splash-hex-inner" />
        <div className="splash-glow" />
        <div style={{ position: "absolute", inset: 0, zIndex: 4 }}>
          <div className="splash-spark" style={{ background: "#7C3AED", animationDelay: "0s" }} />
          <div className="splash-spark" style={{ background: "#EC4899", animationDelay: "-1.3s" }} />
          <div className="splash-spark" style={{ background: "#F59E0B", animationDelay: "-2.6s" }} />
        </div>
        <span className="splash-letter">T</span>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="splash-wordmark" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28,
              letterSpacing: 10,
              background: "linear-gradient(90deg, #7C3AED, #EC4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Campus
          </span>
          <div
            style={{ width: 2, height: 28, background: "linear-gradient(180deg, #7C3AED, #EC4899)", borderRadius: 2 }}
          />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 4, color: "#6B7280" }}>
            Connect
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
          height: 3,
          background: "#1A1A1A",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #7C3AED, #EC4899)",
            borderRadius: 999,
            transition: "width 0.03s linear",
          }}
        />
      </div>

      {/* Created By */}
      <div
        className="splash-created"
        style={{
          position: "absolute",
          bottom: 36,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 10, letterSpacing: 3, color: "#4B5563" }}>
          CREATED BY
        </span>
        <div style={{ width: 1, height: 12, background: "#2D2D2D", borderRadius: 2 }} />
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 4,
            background: "linear-gradient(90deg, #7C3AED, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          SID
        </span>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 10, letterSpacing: 3, color: "#4B5563" }}>
          &
        </span>
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 4,
            background: "linear-gradient(90deg, #EC4899, #F59E0B)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          MONTU
        </span>
      </div>
    </div>
  );
}
