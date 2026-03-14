import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Compass, MessageCircleHeart, User, Sparkles, ChevronLeft, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DatingTransitionOverlay } from "./DatingTransition";
import { CherryBlossomLogo } from "./CherryBlossomLogo";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { path: "/dating/discover", icon: Compass, label: "Discover" },
  { path: "/dating/matches",  icon: MessageCircleHeart, label: "Matches" },
  { path: "/dating/profile",  icon: User, label: "Profile" },
];

export function DatingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCrushDrawer, setShowCrushDrawer] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleExit = () => {
    setExiting(true);
    setTimeout(() => navigate("/feed"), 750);
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/dating/discover" && location.pathname === "/dating");

  return (
    <div className="dating-world relative flex min-h-[100dvh]">
      {/* Actual DesktopSidebar on desktop — rendered here so dating content
          aligns with the main app's content area (left of sidebar = 80px) */}
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── FIX 2: BALANCED HEADER ── */}
        <header className="sticky top-0 z-30 dw-glass border-b border-white/40">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">

            {/* LEFT — back chevron only (clean, minimal weight) */}
            <button
              onClick={handleExit}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:bg-black/[0.05] active:scale-90"
              style={{ color: "hsl(var(--dw-text-muted))" }}
              aria-label="Back to Tbuzz"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* CENTER — cherry blossom T logo (the dating-world identity mark) */}
            <button
              onClick={handleExit}
              className="flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              aria-label="Home"
            >
              <CherryBlossomLogo size={36} />
            </button>

            {/* RIGHT — Secret Crush pill */}
            <button
              onClick={() => setShowCrushDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{
                background: "hsl(340 75% 55% / 0.1)",
                color: "hsl(var(--dw-accent))",
                border: "1px solid hsl(340 75% 55% / 0.2)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Crush</span>
            </button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="flex-1 max-w-lg mx-auto w-full pb-28 relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── FIX 3: FLOATING PILL BOTTOM NAV (mirrors main app pill style) ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-4 sm:pl-24"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <nav
            className="pointer-events-auto flex items-center h-[64px] rounded-full px-2 gap-1"
            style={{
              background: "rgba(255, 252, 249, 0.72)",
              backdropFilter: "blur(24px) saturate(1.5)",
              WebkitBackdropFilter: "blur(24px) saturate(1.5)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 8px 32px rgba(140,40,70,0.1), 0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 h-11 rounded-full transition-all duration-300 text-sm font-medium",
                    active ? "text-white" : "hover:bg-black/[0.04]"
                  )}
                  style={{ color: active ? "white" : "hsl(var(--dw-text-muted))" }}
                >
                  {active && (
                    <motion.div
                      layoutId="dating-nav-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: "linear-gradient(135deg, hsl(340, 72%, 52%), hsl(340, 68%, 44%))" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <tab.icon className="w-4 h-4" />
                    {active && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="overflow-hidden whitespace-nowrap text-xs font-semibold"
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

      </div>{/* end flex-1 column */}

      {/* ── SECRET CRUSH DRAWER ── */}
      <AnimatePresence>
        {showCrushDrawer && (
          <SecretCrushDrawer userId={user?.id} onClose={() => setShowCrushDrawer(false)} />
        )}
      </AnimatePresence>

      {/* ── EXIT TRANSITION ── */}
      <AnimatePresence>
        {exiting && <DatingTransitionOverlay direction="exit" />}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  SECRET CRUSH DRAWER                         */
/* ──────────────────────────────────────────── */

interface CrushSlot {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

function SecretCrushDrawer({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CrushSlot[]>([]);
  const [crushes, setCrushes] = useState<CrushSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Load current crushes
  const loadCrushes = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("secret_crushes")
      .select("crush_id, profiles:crush_id(user_id, display_name, username, avatar_url)")
      .eq("user_id", userId);

    if (data) {
      setCrushes(
        data.map((d: any) => ({
          user_id: d.crush_id,
          display_name: d.profiles?.display_name ?? "Unknown",
          username: d.profiles?.username ?? "",
          avatar_url: d.profiles?.avatar_url ?? null,
        }))
      );
    }
  };

  // Search by username or display name
  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .or(`username.ilike.%${value.trim()}%,display_name.ilike.%${value.trim()}%`)
        .neq("user_id", userId ?? "")
        .limit(6);
      setResults((data as any[]) ?? []);
    } catch (_) {}
    setSearching(false);
  };

  const handleAdd = async (target: CrushSlot) => {
    if (crushes.length >= 3) {
      toast.error("You can only have 3 secret crushes at once.");
      return;
    }
    if (crushes.find(c => c.user_id === target.user_id)) {
      toast.error("Already added as a crush.");
      return;
    }
    setAdding(target.user_id);
    try {
      const { data, error } = await supabase.rpc("add_secret_crush", {
        p_crush_username: target.username,
      });
      if (error) throw error;

      if (data && (data as any).is_match) {
        toast.success("It's a match! 🎉 You both have a crush on each other.");
        onClose();
        navigate(`/messages/${(data as any).conversation_id}`);
      } else {
        toast.success("Secret crush saved quietly. 🤫");
        setCrushes(prev => [...prev, target]);
        setQuery("");
        setResults([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add crush.");
    }
    setAdding(null);
  };

  const handleRemove = async (crushUserId: string) => {
    await (supabase as any)
      .from("secret_crushes")
      .delete()
      .eq("user_id", userId)
      .eq("crush_id", crushUserId);
    setCrushes(prev => prev.filter(c => c.user_id !== crushUserId));
  };

  // Load on mount
  useEffect(() => { loadCrushes(); }, [userId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.25)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="dw-glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-black/10 mx-auto mb-5 sm:hidden" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4" style={{ color: "hsl(var(--dw-text-muted))" }} />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--dw-accent))" }} />
            <h3 className="font-editorial text-2xl" style={{ color: "hsl(var(--dw-text))" }}>
              Secret Crushes
            </h3>
          </div>
          <p className="text-xs" style={{ color: "hsl(var(--dw-text-soft))" }}>
            If they add you back, we'll reveal the magic. Up to 3 crushes.
          </p>
        </div>

        {/* Crush slots */}
        {crushes.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            {crushes.map(c => (
              <div
                key={c.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "hsl(340 75% 55% / 0.06)", border: "1px solid hsl(340 75% 55% / 0.15)" }}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-rose-100 flex items-center justify-center shrink-0">
                  {c.avatar_url
                    ? <img src={c.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-rose-400">{c.display_name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--dw-text))" }}>{c.display_name}</p>
                  <p className="text-xs truncate" style={{ color: "hsl(var(--dw-text-soft))" }}>@{c.username}</p>
                </div>
                <button
                  onClick={() => handleRemove(c.user_id)}
                  className="text-xs px-2 py-1 rounded-full hover:bg-black/5 transition-colors"
                  style={{ color: "hsl(var(--dw-text-soft))" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search field */}
        {crushes.length < 3 && (
          <div className="relative mb-3">
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full bg-white/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 font-sans"
              style={{
                border: "1px solid hsl(var(--dw-border))",
                color: "hsl(var(--dw-text))",
                ["--tw-ring-color" as string]: "hsla(340, 75%, 55%, 0.3)",
              }}
              autoCapitalize="none"
              autoComplete="off"
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "hsl(var(--dw-text-soft))" }} />
            )}
          </div>
        )}

        {/* Search results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex flex-col gap-1 mb-2"
            >
              {results.map(r => (
                <button
                  key={r.user_id}
                  onClick={() => handleAdd(r)}
                  disabled={adding === r.user_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all hover:bg-black/[0.03] active:scale-[0.98]"
                  style={{ background: "white" }}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                    {r.avatar_url
                      ? <img src={r.avatar_url} className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{r.display_name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--dw-text))" }}>{r.display_name}</p>
                    <p className="text-xs truncate" style={{ color: "hsl(var(--dw-text-soft))" }}>@{r.username}</p>
                  </div>
                  {adding === r.user_id
                    ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "hsl(var(--dw-accent))" }} />
                    : <Heart className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--dw-accent))" }} />
                  }
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {crushes.length === 0 && query.length < 2 && (
          <p className="text-center text-xs py-3" style={{ color: "hsl(var(--dw-text-soft))" }}>
            Type at least 2 characters to search
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
