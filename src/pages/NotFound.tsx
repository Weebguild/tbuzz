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

/**
 * NotFound Page
 * A premium, interactive 404 state inspired by "Zero Gravity" and "Midnight Glass" aesthetics.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-black overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Particle Simulation */}
      <AntiGravityCanvas />

      {/* Foreground Content */}
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
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="group relative h-12 px-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white hover:text-black transition-all duration-300"
            >
              <MoveLeft className="mr-2 size-4 group-hover:-translate-x-1 transition-transform" />
              Scan for Home
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            </Button>
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
