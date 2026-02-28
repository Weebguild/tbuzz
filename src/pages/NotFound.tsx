import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AntiGravityCanvas } from "@/components/AntiGravityCanvas";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { MoveLeft, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NotFound Page
 * A premium, interactive 404 state inspired by "Zero Gravity" and "Cyber-Glow" aesthetics.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-black overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* 1. Cyber Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1f1f23 1px, transparent 1px),
            linear-gradient(to bottom, #1f1f23 1px, transparent 1px)
          `,
          backgroundSize: '2rem 2rem',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }}
      />

      {/* 2. Background Particle Simulation */}
      <AntiGravityCanvas />

      {/* 3. Foreground Content */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <Empty className="border-none bg-transparent p-0 md:p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="mb-8 scale-150">
              <Ghost className="size-6 text-purple-400" />
            </EmptyMedia>

            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
                404
              </h1>
              <EmptyTitle className="text-2xl md:text-3xl text-white tracking-tight">
                Lost in the Void
              </EmptyTitle>
            </div>

            <EmptyDescription className="mt-4 max-w-[280px] text-white/50 text-base font-light">
              The page you are looking for has drifted beyond the event horizon.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="mt-10">
            {/* ── CYBER GLOW BUTTON ── */}
            <div className="group relative">
              {/* Glow Layers */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

              <Button
                onClick={() => navigate("/")}
                className={cn(
                  "relative h-12 px-8 rounded-full border border-white/10 bg-black text-white overflow-hidden",
                  "transition-all duration-500 active:scale-95 z-10"
                )}
              >
                {/* Conic Gradient Spinner */}
                <div
                  className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_40%,#a855f7_50%,transparent_60%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />

                {/* Inner Mask */}
                <div className="absolute inset-[1px] rounded-full bg-black z-[-1]" />

                <span className="relative z-10 flex items-center gap-2 font-bold tracking-wide">
                  <MoveLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                  Scan for Home
                </span>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>

      {/* Aesthetic Accents */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none opacity-20">
        <span className="text-[10px] uppercase tracking-[0.4em] text-white font-medium">Signal Lost</span>
        <div className="h-12 w-px bg-gradient-to-b from-white to-transparent" />
      </div>
    </div>
  );
};

export default NotFound;
