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
      <div className="sticky top-0 z-10 dw-glass border-b border-white/40 px-5 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--dw-text))" }}>
            My Profile
          </p>
          <div className="flex items-center gap-3">
            {/* Active toggle */}
            <button
              onClick={toggleActive}
              disabled={togglingActive}
              className="flex items-center gap-2 text-xs font-medium transition-all"
              style={{ color: profile.is_active ? "hsl(var(--dw-accent))" : "hsl(var(--dw-text-soft))" }}
            >
              {togglingActive
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : profile.is_active
                ? <ToggleRight className="w-5 h-5" />
                : <ToggleLeft className="w-5 h-5" />
              }
              <span>{profile.is_active ? "Live" : "Paused"}</span>
            </button>

            {/* Edit button */}
            <button
              onClick={() => navigate("/dating/onboarding")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: "hsl(340 75% 55% / 0.1)",
                color: "hsl(var(--dw-accent))",
                border: "1px solid hsl(340 75% 55% / 0.2)",
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* ── PROFILE PREVIEW ── */}
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Status banner */}
        {!profile.is_active && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4 text-sm"
            style={{
              background: "hsl(40,30%,96%)",
              border: "1px solid hsl(40,20%,88%)",
              color: "hsl(var(--dw-text-muted))",
            }}
          >
            <span>⏸</span>
            <span>Your profile is paused — others can't see you.</span>
          </div>
        )}

        {/* Hero media */}
        {profile.media[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full aspect-[4/5] rounded-2xl overflow-hidden mb-4"
            style={{ boxShadow: "var(--dw-shadow-lg)" }}
          >
            {profile.media[0].match(/\.(mp4|mov)$/i)
              ? <video src={profile.media[0]} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              : <img src={profile.media[0]} alt="" className="w-full h-full object-cover" />
            }
          </motion.div>
        )}

        {/* Vital chips */}
        {visVitals.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {visVitals.map(([key, val]) => (
              <span key={key} className="dw-chip dw-chip-active text-xs">{val.value}</span>
            ))}
          </div>
        )}

        {/* Prompts */}
        {promptEntries.map(([q, a], i) => (
          <div key={i} className="dw-prompt-card p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "hsl(var(--dw-text-soft))" }}>
              {q}
            </p>
            <p className="font-editorial text-xl" style={{ color: "hsl(var(--dw-text))" }}>{a}</p>
          </div>
        ))}

        {/* More photos */}
        {profile.media.length > 1 && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {profile.media.slice(1).map((url, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl overflow-hidden" style={{ boxShadow: "var(--dw-shadow)" }}>
                {url.match(/\.(mp4|mov)$/i)
                  ? <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                  : <img src={url} alt="" className="w-full h-full object-cover" />
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
