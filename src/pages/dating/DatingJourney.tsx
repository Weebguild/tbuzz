import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, Heart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  {
    title: "Liquid Ember",
    subtitle: "A deeper way to connect.",
    description: "Welcome to a world where connection feels visceral and premium. No more swiping, just discovering.",
    icon: Flame,
    color: "text-amber-500",
  },
  {
    title: "Glass & Bento",
    subtitle: "Clarity in discovery.",
    description: "Profiles organized beautifully. High-fidelity media and editorial prompts that show the real you.",
    icon: Sparkles,
    color: "text-purple-400",
  },
  {
    title: "The Journey",
    subtitle: "Starts with you.",
    description: "Set up your presence in the Liquid Ember world. It only takes a few moments to ignite a spark.",
    icon: Heart,
    color: "text-rose-500",
  },
];

export default function DatingJourney() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1);
    } else {
      navigate("/dating/onboarding");
    }
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="dating-world min-h-[100dvh] flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Background Animated Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-sm flex flex-col items-center text-center"
        >
          <div className={cn("w-20 h-20 rounded-3xl liquid-glass flex items-center justify-center mb-10", slides[currentSlide].color)}>
            <SlideIcon className="w-10 h-10" />
          </div>

          <h1 className="font-editorial text-5xl md:text-6xl text-white mb-4 leading-tight">
            {slides[currentSlide].title}
          </h1>
          <p className="text-xl text-white/80 font-medium mb-6">
            {slides[currentSlide].subtitle}
          </p>
          <p className="text-white/40 leading-relaxed mb-12 max-w-[280px]">
            {slides[currentSlide].description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress Dots */}
      <div className="flex gap-2 mb-12">
        {slides.map((_, i) => (
          <div
            key={i}
            className={cn(
              "dw-step-dot transition-all duration-500",
              i === currentSlide ? "dw-step-dot-active" : (i < currentSlide ? "bg-white/40" : "bg-white/10")
            )}
          />
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={next}
        className="dw-btn-liquid w-full max-w-xs py-5 flex items-center justify-center gap-2 group"
      >
        <span className="text-lg font-bold">
          {currentSlide === slides.length - 1 ? "Begin the Journey" : "Next"}
        </span>
        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </motion.button>
      
      {/* Skip button for the impatient */}
      <button 
        onClick={() => navigate("/dating/onboarding")}
        className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
      >
        Skip Introduction
      </button>
    </div>
  );
}
