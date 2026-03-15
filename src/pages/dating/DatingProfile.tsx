import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Pencil, ToggleLeft, ToggleRight, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DatingProfile {
  id: string;
  media: string[];
  vitals: Record<string, { value: string; visible: boolean }>;
  prompts: Record<string, string>;
  is_active: boolean;
}

export default function DatingProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("dating_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => { setProfile(data as any); setLoading(false); });
  }, [user]);

  const toggleActive = async () => {
    if (!profile) return;
    setTogglingActive(true);
    const { error } = await supabase
      .from("dating_profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", user!.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
      toast.success(profile.is_active ? "Profile paused." : "Profile is live again!");
    }
    setTogglingActive(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "hsl(340 75% 55% / 0.1)" }}
        >
          <Heart className="w-8 h-8" style={{ color: "hsl(var(--dw-accent))" }} />
        </div>
        <div>
          <h3 className="font-editorial text-2xl mb-2" style={{ color: "hsl(var(--dw-text))" }}>
            No dating profile yet
          </h3>
          <p className="text-sm" style={{ color: "hsl(var(--dw-text-soft))" }}>
            Set up your profile to start discovering people.
          </p>
        </div>
        <button
          onClick={() => navigate("/dating/onboarding")}
          className="dw-btn-primary px-8 py-3.5 text-sm font-semibold"
        >
          Create Profile
        </button>
      </div>
    );
  }

  const visVitals = Object.entries(profile.vitals || {}).filter(([_, v]) => v.visible && v.value);
  const promptEntries = Object.entries(profile.prompts || {});

  return (
    <div className="pb-8">
      {/* ── HEADER ACTIONS ── */}
      <div className="sticky top-0 z-10 liquid-glass border-b border-white/5 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <p className="font-editorial text-2xl text-white tracking-tighter">
            PRO<span className="text-white/30 font-sans tracking-normal font-light">FILE</span>
          </p>
          <div className="flex items-center gap-3">
            {/* Active toggle */}
            <button
              onClick={toggleActive}
              disabled={togglingActive}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{ color: profile.is_active ? "hsl(var(--dw-accent))" : "white/30" }}
            >
              {togglingActive
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : profile.is_active
                ? <ToggleRight className="w-6 h-6" />
                : <ToggleLeft className="w-6 h-6 opacity-30" />
              }
              <span>{profile.is_active ? "Live" : "Paused"}</span>
            </button>

            {/* Edit button */}
            <button
              onClick={() => navigate("/dating/onboarding")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[2rem] text-[11px] font-bold tracking-widest uppercase transition-all hyper-glass group"
            >
              <Pencil className="w-3.5 h-3.5 text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-white/80 group-hover:text-white">Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── PROFILE PREVIEW ── */}
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Status banner */}
        {!profile.is_active && (
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-[2rem] mb-6 text-sm hyper-glass border-amber-500/30"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_orange]" />
            </span>
            <span className="text-white/70 font-mono tracking-tight">System Halted. Not visible in void.</span>
          </div>
        )}

        {/* Hero media */}
        {profile.media[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full aspect-[4/5] rounded-[3rem] overflow-hidden mb-8 hyper-glass"
          >
            {profile.media[0].match(/\.(mp4|mov)$/i)
              ? <video src={profile.media[0]} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-80 mix-blend-lighten" />
              : <img src={profile.media[0]} alt="" className="w-full h-full object-cover opacity-80 mix-blend-lighten" />
            }
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />
          </motion.div>
        )}

        {/* Vital chips */}
        {visVitals.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-10">
            {visVitals.map(([key, val]) => (
              <span key={key} className="hyper-glass px-5 py-2.5 rounded-[2rem] text-[10px] font-mono tracking-widest text-cyan-400 border-t-cyan-500/30">
                {val.value}
              </span>
            ))}
          </div>
        )}

        {/* Prompts */}
        {promptEntries.map(([q, a], i) => (
          <div key={i} className="hyper-glass hyper-glass-magenta rounded-[3rem] p-8 mb-8 relative overflow-hidden">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] mb-4 text-white/40 pl-3 border-l-[1px] border-magenta-500/50 relative z-10">
              <span className="absolute -left-[1px] top-0 w-[2px] h-1/2 bg-magenta-400 opacity-50 shadow-[0_0_10px_magenta]" />
              {q}
            </p>
            <p className="font-editorial text-3xl leading-[1.1] text-white/90 relative z-10 tracking-tight">"{a}"</p>
          </div>
        ))}

        {/* More photos */}
        {profile.media.length > 1 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {profile.media.slice(1).map((url, i) => (
              <div key={i} className="aspect-[3/4] rounded-[2.5rem] overflow-hidden hyper-glass relative">
                {url.match(/\.(mp4|mov)$/i)
                  ? <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-70 mix-blend-lighten" />
                  : <img src={url} alt="" className="w-full h-full object-cover opacity-70 mix-blend-lighten" />
                }
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
