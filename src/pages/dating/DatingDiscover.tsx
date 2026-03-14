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

      {/* ── FLOATING ACTION BAR ── */}
      {!likesExhausted && currentProfile && !matchData?.open && (
        <div className="action-glass-bar animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Pass button */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handlePass}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <X className="w-6 h-6 text-white/60" />
          </motion.button>

          {/* Core Like Button - Liquid Glow */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleQuickLike}
            disabled={sendingLike}
            className="w-16 h-16 rounded-full flex items-center justify-center dw-btn-liquid"
          >
            {sendingLike
              ? <Loader2 className="w-7 h-7 animate-spin" />
              : <Heart className="w-8 h-8" fill="white" />
            }
          </motion.button>

          {/* Spark/Super-like button placeholder/equivalent */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10"
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
          </motion.button>
        </div>
      )}

      {/* ── ICEBREAKER DRAWER ── */}
      {/* ... keeping the same drawer logic but can refine styles later if needed ... */}

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
    <div className="w-full max-w-lg mx-auto overflow-hidden">
      {/* ── HERO BLOCK (Aria Style) ── */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden rounded-b-[3rem]">
        {profile.media[0] && (
          profile.media[0].match(/\.(mp4|mov)$/i)
            ? <video src={profile.media[0]} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            : <img src={profile.media[0]} alt="" className="w-full h-full object-cover" />
        )}
        
        {/* Shadow-depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Name Overlay */}
        <div className="absolute bottom-10 left-8">
          <h1 className="font-editorial text-5xl md:text-6xl text-white drop-shadow-2xl mb-1">
            {profile.user_details.display_name}, 26
          </h1>
          <p className="text-white/60 text-sm font-medium flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active today • 2 miles away
          </p>
        </div>

        {/* Heart-on-media button */}
        <HeartBtn onClick={() => onHeartClick(profile.media[0], "media")} className="top-6 right-6" />
      </div>

      {/* ── BENTO SECTION ── */}
      <div className="px-6 py-12">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4 ml-1">Vitals & Lifestyle</h3>
        <div className="bento-grid">
          {visVitals.map(([key, data], idx) => (
            <div key={key} className={cn("bento-item", idx % 3 === 0 ? "col-span-2" : "col-span-1")}>
               <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">{key}</span>
               <span className="font-editorial text-xl text-amber-500/90">{data.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── INTERLEAVED PROMPTS & MEDIA ── */}
      {/* ... Rest of components refined ... */}

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
    <div className="relative px-8 py-20 flex flex-col items-start justify-center overflow-hidden">
      {/* Background glow for interest */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32" />
      
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-6 px-1 border-l-2 border-amber-500/40 ml-1">
        {question}
      </p>
      <p className="font-editorial text-4xl leading-[1.15] text-white/95 relative z-10 px-1">
        "{answer}"
      </p>
      
      <button
        onClick={onHeart}
        className="absolute top-8 right-8 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 liquid-glass-accent"
      >
        <Heart className="w-5 h-5 text-amber-500" />
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
