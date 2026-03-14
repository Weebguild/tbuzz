import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, Send, Clock, Loader2, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MatchReveal } from "@/components/dating/MatchReveal";

/* ──────────────────────────────────────────── */
/*  TYPES                                        */
/* ──────────────────────────────────────────── */

type DatingProfile = {
  id: string;
  media: string[];
  vitals: Record<string, { value: string; visible: boolean }>;
  prompts: Record<string, string>;
  is_active: boolean;
  user_details: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
};

type IcebreakerState = {
  open: boolean;
  contentObj: string;
  type: "media" | "prompt";
} | null;

export default function DatingDiscover() {
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likesExhausted, setLikesExhausted] = useState(false);
  const [icebreaker, setIcebreaker] = useState<IcebreakerState>(null);
  const [icebreakerComment, setIcebreakerComment] = useState("");
  const [sendingLike, setSendingLike] = useState(false);
  const [likePressed, setLikePressed] = useState(false);
  const [matchData, setMatchData] = useState<{
    open: boolean;
    matchedProfile: DatingProfile | null;
    conversationId: string;
  } | null>(null);

  const currentProfile = profiles[currentIndex];

  useEffect(() => {
    if (!user) return;
    fetchDiscoverFeed();
  }, [user]);

  const fetchDiscoverFeed = async () => {
    try {
      const { data: myLikes } = await supabase
        .from("dating_likes")
        .select("receiver_id")
        .eq("sender_id", user!.id);

      const likedIds = (myLikes || []).map((l: any) => l.receiver_id);
      const passedIds = JSON.parse(sessionStorage.getItem("dating_passes") || "[]");
      const excludedIds = new Set([...likedIds, ...passedIds, user!.id]);

      const { data: dProfiles, error } = await supabase
        .from("dating_profiles")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      const candidates = dProfiles.filter((p: any) => !excludedIds.has(p.id));

      if (!candidates.length) { setProfiles([]); setLoading(false); return; }

      const { data: publicProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", candidates.map((c: any) => c.id));

      const merged = candidates.map((dp: any) => {
        const pub = (publicProfiles as any[])?.find((p: any) => p.user_id === dp.id);
        return { ...dp, user_details: pub || { display_name: "Anonymous", avatar_url: "", username: "" } };
      });

      setProfiles(merged);
    } catch (err) {
      console.error("Error fetching feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePass = () => {
    if (!currentProfile) return;
    const passed = JSON.parse(sessionStorage.getItem("dating_passes") || "[]");
    sessionStorage.setItem("dating_passes", JSON.stringify([...passed, currentProfile.id]));
    setCurrentIndex(i => i + 1);
  };

  // Quick like — no icebreaker required
  const handleQuickLike = async () => {
    if (!currentProfile) return;
    setLikePressed(true);
    setTimeout(() => setLikePressed(false), 500);
    setSendingLike(true);
    try {
      const { data, error } = await supabase.rpc("send_dating_like", {
        p_receiver_id: currentProfile.id,
        p_content_liked: "",
        p_comment: "",
      });

      if (error) {
        if (error.message.includes("Daily limit")) {
          setLikesExhausted(true);
        } else throw error;
        return;
      }

      if (data && (data as any).is_match) {
        setMatchData({ open: true, matchedProfile: currentProfile, conversationId: (data as any).conversation_id });
      } else {
        toast.success("💌 Like sent!");
        handlePass();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSendingLike(false);
    }
  };

  // Icebreaker like (with message)
  const handleIcebreakerSubmit = async () => {
    if (!currentProfile || !icebreaker) return;
    setSendingLike(true);
    try {
      const { data, error } = await supabase.rpc("send_dating_like", {
        p_receiver_id: currentProfile.id,
        p_content_liked: icebreaker.contentObj,
        p_comment: icebreakerComment.trim(),
      });

      if (error) {
        if (error.message.includes("Daily limit")) {
          setLikesExhausted(true);
          setIcebreaker(null);
        } else throw error;
        return;
      }

      setIcebreaker(null);
      setIcebreakerComment("");

      if (data && (data as any).is_match) {
        setMatchData({ open: true, matchedProfile: currentProfile, conversationId: (data as any).conversation_id });
      } else {
        toast.success("💌 Like sent with a note!");
        handlePass();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSendingLike(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh]" style={{ background: "hsl(var(--dw-bg))" }}>
      {/* ── MAIN CONTENT ── */}
      {likesExhausted ? (
        <OutOfLikesState />
      ) : currentProfile ? (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentProfile.id}
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="pb-36"
          >
            <ProfileScroll
              profile={currentProfile}
              onHeartClick={(content, type) => setIcebreaker({ open: true, contentObj: content, type })}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <EndOfFeedState />
      )}

      {/* ── FLOATING ACTION BUTTONS ── */}
      {!likesExhausted && currentProfile && !matchData?.open && (
        <div className="fixed bottom-24 left-0 right-0 z-30 flex items-center justify-center gap-6">
          {/* Pass button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handlePass}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            }}
          >
            <X className="w-6 h-6 stroke-[2.5]" style={{ color: "hsl(220, 8%, 55%)" }} />
          </motion.button>

          {/* Like button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleQuickLike}
            disabled={sendingLike}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all",
              likePressed ? "dw-like-pressed" : ""
            )}
            style={{
              background: "linear-gradient(135deg, hsl(340, 75%, 58%), hsl(340, 70%, 46%))",
              boxShadow: "0 8px 28px hsla(340, 75%, 55%, 0.45)",
            }}
          >
            {sendingLike
              ? <Loader2 className="w-6 h-6 text-white animate-spin" />
              : <Heart className="w-7 h-7 text-white" fill="white" />
            }
          </motion.button>
        </div>
      )}

      {/* ── ICEBREAKER DRAWER ── */}
      <AnimatePresence>
        {icebreaker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            style={{ background: "rgba(20,10,10,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setIcebreaker(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="dw-glass-strong w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-black/10 mx-auto mb-5 sm:hidden" />

              <button
                onClick={() => setIcebreaker(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: "hsl(var(--dw-text-soft))" }} />
              </button>

              <h3 className="font-editorial text-2xl mb-1" style={{ color: "hsl(var(--dw-text))" }}>
                Add a Note
              </h3>
              <p className="text-xs mb-5" style={{ color: "hsl(var(--dw-text-soft))" }}>
                Optional — your message will appear with the like.
              </p>

              {/* Preview of what they reacted to */}
              <div className="w-full rounded-xl overflow-hidden mb-5 bg-stone-100" style={{ maxHeight: "28vh" }}>
                {icebreaker.type === "media" ? (
                  icebreaker.contentObj.match(/\.(mp4|mov)$/i) ? (
                    <video src={icebreaker.contentObj} muted autoPlay loop playsInline className="w-full h-full object-cover" style={{ maxHeight: "28vh" }} />
                  ) : (
                    <img src={icebreaker.contentObj} className="w-full object-cover" style={{ maxHeight: "28vh" }} />
                  )
                ) : (
                  <div className="p-5 bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center min-h-[80px]">
                    <p className="font-editorial text-xl text-center" style={{ color: "hsl(var(--dw-text))" }}>
                      "{icebreaker.contentObj}"
                    </p>
                  </div>
                )}
              </div>

              <textarea
                value={icebreakerComment}
                onChange={e => setIcebreakerComment(e.target.value)}
                placeholder="Write something thoughtful... (optional)"
                rows={3}
                className="w-full bg-white/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none font-sans mb-4"
                style={{
                  border: "1px solid hsl(var(--dw-border))",
                  color: "hsl(var(--dw-text))",
                  ["--tw-ring-color" as string]: "hsla(340,75%,55%,0.3)",
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleIcebreakerSubmit}
                  disabled={sendingLike}
                  className="flex-1 dw-btn-primary py-3.5 flex items-center justify-center gap-2"
                >
                  {sendingLike ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Like</>}
                </button>
                <button
                  onClick={handleQuickLike}
                  disabled={sendingLike}
                  className="flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                  style={{
                    background: "hsl(340 75% 55% / 0.08)",
                    color: "hsl(var(--dw-accent))",
                    border: "1px solid hsl(340 75% 55% / 0.2)",
                  }}
                >
                  <Heart className="w-4 h-4" />
                  Just Like
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MATCH REVEAL ── */}
      <AnimatePresence>
        {matchData?.open && (
          <MatchReveal
            matchedUser={{
              display_name: matchData.matchedProfile?.user_details.display_name || "Unknown",
              avatar_url: matchData.matchedProfile?.user_details.avatar_url || null,
            }}
            currentUser={{
              display_name: (myProfile as any)?.display_name || "You",
              avatar_url: (myProfile as any)?.avatar_url || null,
            }}
            conversationId={matchData.conversationId}
            onDismiss={() => { setMatchData(null); handlePass(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  PROFILE SCROLL CARD                          */
/* ──────────────────────────────────────────── */

function ProfileScroll({ profile, onHeartClick }: {
  profile: DatingProfile;
  onHeartClick: (c: string, t: "media" | "prompt") => void;
}) {
  const visVitals = Object.entries(profile.vitals || {})
    .filter(([_, d]) => d.visible && d.value);

  const promptEntries = Object.entries(profile.prompts || {});

  return (
    <div className="w-full mx-auto">
      {/* ── HERO BLOCK ── */}
      <div className="relative w-full" style={{ height: "80dvh" }}>
        {profile.media[0] && (
          profile.media[0].match(/\.(mp4|mov)$/i)
            ? <video src={profile.media[0]} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            : <img src={profile.media[0]} alt="" className="w-full h-full object-cover" />
        )}
        {/* Bottom gradient + name overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="font-editorial text-5xl text-white mb-3 drop-shadow-md leading-tight">
            {profile.user_details.display_name}
          </h1>
          {visVitals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visVitals.slice(0, 4).map(([key, data]) => (
                <span
                  key={key}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  {data.value}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Heart-on-media button */}
        <HeartBtn onClick={() => onHeartClick(profile.media[0], "media")} className="top-4 right-4" />
        {/* Scroll hint */}
        <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1 opacity-70">
          <ChevronUp className="w-4 h-4 text-white animate-bounce" style={{ animationDuration: "1.5s" }} />
          <span className="text-white text-[10px] font-medium">scroll</span>
        </div>
      </div>

      {/* ── ABOUT SECTION ── */}
      {visVitals.length > 4 && (
        <div className="px-5 py-8" style={{ background: "hsl(var(--dw-bg))" }}>
          <div className="flex flex-wrap gap-2">
            {visVitals.slice(4).map(([key, data]) => (
              <span key={key} className="dw-chip">{data.value}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── MEDIA + PROMPTS INTERLEAVED ── */}
      {[1, 2].map(idx => (
        <div key={idx}>
          {profile.media[idx] && (
            <div className="relative w-full" style={{ minHeight: "70dvh" }}>
              {profile.media[idx].match(/\.(mp4|mov)$/i)
                ? <LoopVideo src={profile.media[idx]} />
                : <img src={profile.media[idx]} alt="" className="w-full object-cover" style={{ minHeight: "70dvh" }} />
              }
              <HeartBtn onClick={() => onHeartClick(profile.media[idx], "media")} />
            </div>
          )}
          {promptEntries[idx - 1] && (
            <PromptBlock
              question={promptEntries[idx - 1][0]}
              answer={promptEntries[idx - 1][1]}
              onHeart={() => onHeartClick(promptEntries[idx - 1][1], "prompt")}
            />
          )}
        </div>
      ))}

      {/* ── REMAINING MEDIA ── */}
      {profile.media.slice(3).map((url, i) => (
        <div key={i} className="relative w-full" style={{ minHeight: "65dvh" }}>
          {url.match(/\.(mp4|mov)$/i)
            ? <LoopVideo src={url} />
            : <img src={url} alt="" className="w-full object-cover" style={{ minHeight: "65dvh" }} />
          }
          <HeartBtn onClick={() => onHeartClick(url, "media")} />
        </div>
      ))}

      <div className="h-16" style={{ background: "hsl(var(--dw-bg))" }} />
    </div>
  );
}

function LoopVideo({ src }: { src: string }) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className="w-full object-cover"
      style={{ minHeight: "65dvh" }}
    />
  );
}

function HeartBtn({ onClick, className }: { onClick: () => void; className?: string }) {
  const [burst, setBurst] = useState(false);
  return (
    <button
      onClick={() => { setBurst(true); onClick(); setTimeout(() => setBurst(false), 500); }}
      className={cn(
        "absolute z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all",
        burst ? "dw-like-pressed" : "",
        className || "bottom-4 right-4"
      )}
      style={{
        background: "rgba(255,255,255,0.25)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.4)",
      }}
    >
      <Heart className="w-5 h-5 text-white drop-shadow-md" fill="white" />
    </button>
  );
}

function PromptBlock({ question, answer, onHeart }: { question: string; answer: string; onHeart: () => void }) {
  return (
    <div className="relative px-5 py-14 flex flex-col items-start justify-center" style={{ background: "hsl(var(--dw-bg))" }}>
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "hsl(var(--dw-text-soft))" }}
      >
        {question}
      </p>
      <p className="font-editorial text-4xl leading-tight" style={{ color: "hsl(var(--dw-text))" }}>
        "{answer}"
      </p>
      <button
        onClick={onHeart}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: "hsl(340 75% 55% / 0.1)",
          border: "1px solid hsl(340 75% 55% / 0.2)",
        }}
      >
        <Heart className="w-4 h-4" style={{ color: "hsl(var(--dw-accent))" }} />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  EMPTY STATES                                 */
/* ──────────────────────────────────────────── */

function OutOfLikesState() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "hsl(340 75% 55% / 0.1)" }}
      >
        <Clock className="w-9 h-9" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
      <h2 className="font-editorial text-4xl mb-3" style={{ color: "hsl(var(--dw-text))" }}>
        That's your 4 for today
      </h2>
      <p className="text-sm mb-8" style={{ color: "hsl(var(--dw-text-soft))" }}>
        Come back tomorrow. Patience makes the heart grow fonder.
      </p>
      <div
        className="px-8 py-4 rounded-2xl font-mono text-2xl tracking-widest"
        style={{
          background: "white",
          color: "hsl(var(--dw-accent))",
          boxShadow: "var(--dw-shadow)",
        }}
      >
        {timeLeft || "00:00:00"}
      </div>
    </div>
  );
}

function EndOfFeedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div
        className="w-full max-w-xs p-8 rounded-3xl"
        style={{ background: "white", boxShadow: "var(--dw-shadow-lg)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "hsl(340 75% 55% / 0.1)" }}
        >
          <Sparkles className="w-7 h-7" style={{ color: "hsl(var(--dw-accent))" }} />
        </div>
        <h2 className="font-editorial text-3xl mb-2" style={{ color: "hsl(var(--dw-text))" }}>
          You've seen everyone
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--dw-text-soft))" }}>
          Check back tomorrow for new people in your area.
        </p>
      </div>
    </div>
  );
}
