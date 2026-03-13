import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, Send, Clock, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NeonSparkOverlay } from "@/components/feed/NeonSparkOverlay";
import { HeartBurst } from "@/components/feed/HeartBurst";

// Types
type Profile = {
  id: string; // From dating_profiles.id == user_id
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

export default function DatingDiscover() {
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // States
  const [likesExhausted, setLikesExhausted] = useState(false);
  const [showCrushDrawer, setShowCrushDrawer] = useState(false);
  
  const [icebreaker, setIcebreaker] = useState<{
    open: boolean;
    contentObj: string;
    type: "media" | "prompt";
  } | null>(null);
  
  const [icebreakerComment, setIcebreakerComment] = useState("");
  const [sendingLike, setSendingLike] = useState(false);

  const [matchData, setMatchData] = useState<{
    open: boolean;
    matchedProfile: Profile | null;
    conversationId: string;
    matchedUsername?: string;
  } | null>(null);

  const currentProfile = profiles[currentIndex];

  useEffect(() => {
    if (!user) return;
    fetchDiscoverFeed();
  }, [user]);

  const fetchDiscoverFeed = async () => {
    try {
      // 1. Get my sent likes
      const { data: myLikes } = await supabase
        .from("dating_likes")
        .select("receiver_id")
        .eq("sender_id", user!.id);
      
      const likedIds = (myLikes || []).map((l: any) => l.receiver_id);
      
      // We also track local passes for session simple logic
      const passedIds = JSON.parse(sessionStorage.getItem("dating_passes") || "[]");
      const excludedIds = new Set([...likedIds, ...passedIds, user!.id]);

      // 2. Get active dating profiles
      const { data: dProfiles, error } = await supabase
        .from("dating_profiles")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      const candidates = dProfiles.filter((p: any) => !excludedIds.has(p.id));

      if (candidates.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // 3. Fetch their public user profiles
      const { data: publicProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", candidates.map((c: any) => c.id));

      const merged = candidates.map((dp: any) => {
        const pub = publicProfiles?.find((p: any) => p.user_id === dp.id);
        return {
          ...dp,
          user_details: pub || { display_name: "Anonymous", avatar_url: "", username: "" }
        };
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

  const handleLikeSubmit = async () => {
    if (!currentProfile || !icebreaker) return;
    if (!icebreakerComment.trim()) {
      toast.error("An icebreaker is required.");
      return;
    }

    setSendingLike(true);
    try {
      const { data, error } = await supabase.rpc("send_dating_like", {
        p_receiver_id: currentProfile.id,
        p_content_liked: icebreaker.contentObj,
        p_comment: icebreakerComment.trim()
      });

      if (error) {
        if (error.message.includes("Daily limit")) {
          setLikesExhausted(true);
          setIcebreaker(null);
        } else {
          throw error;
        }
        return;
      }

      // data is a JSONB object from our RPC: { is_match: boolean, conversation_id: string }
      setIcebreaker(null);
      setIcebreakerComment("");

      if (data && (data as any).is_match) {
        setMatchData({
          open: true,
          matchedProfile: currentProfile,
          conversationId: (data as any).conversation_id
        });
        
        // Auto-route after 3.5s
        setTimeout(() => {
          navigate(`/messages/${(data as any).conversation_id}`);
        }, 3500);
      } else {
        toast.success("Like sent into the ether.");
        handlePass(); // moves to next
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
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#faf8f5]">
      {/* -- HEADER (Floating Crush Drawer Toggle) -- */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowCrushDrawer(true)}
          className="p-3 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_4px_16px_rgb(0,0,0,0.06)] hover:bg-white transition-all text-[#7C3AED]"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* -- MAIN FEED OR ZERO STATE -- */}
      {likesExhausted ? (
        <OutofLikesState />
      ) : currentProfile ? (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentProfile.id}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pb-32"
          >
            <ProfileScroll 
              profile={currentProfile} 
              onHeartClick={(content, type) => setIcebreaker({ open: true, contentObj: content, type })} 
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <EndofFeedState />
      )}

      {/* -- FLOATING PASS BUTTON (Only if profile exists and no modals open) -- */}
      {!likesExhausted && currentProfile && !matchData && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={handlePass}
          className="fixed bottom-24 right-6 z-30 w-14 h-14 bg-white hover:bg-[#faf8f5] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full flex items-center justify-center text-[#5A5A5A] transition-all"
        >
          <X className="w-6 h-6 stroke-[3]" />
        </motion.button>
      )}

      {/* -- MODALS & DRAWERS -- */}
      
      {/* ICEBREAKER MODAL */}
      <AnimatePresence>
        {icebreaker && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#faf8f5] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setIcebreaker(null)} 
                className="absolute top-4 right-4 p-2 bg-black/5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="font-editorial text-3xl mb-4 text-[#2c2c2c]">Break the Ice</h3>
              
              <div className="w-full aspect-[3/4] max-h-[30vh] rounded-xl overflow-hidden mb-6 bg-black/5 mx-auto">
                {icebreaker.type === "media" ? (
                  icebreaker.contentObj.endsWith('.mp4') ? (
                    <video src={icebreaker.contentObj} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={icebreaker.contentObj} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 bg-[#f0ece6] text-center">
                    <p className="font-editorial text-2xl">"{icebreaker.contentObj}"</p>
                  </div>
                )}
              </div>

              <textarea
                value={icebreakerComment}
                onChange={e => setIcebreakerComment(e.target.value)}
                placeholder="Write something thoughtful..."
                className="w-full bg-white border border-black/5 rounded-xl p-4 min-h-[100px] mb-4 
                           focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 font-sans shadow-sm resize-none"
              />
              
              <button
                onClick={handleLikeSubmit}
                disabled={sendingLike || !icebreakerComment.trim()}
                className="w-full py-4 rounded-full bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] 
                           transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/20"
              >
                {sendingLike ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Send className="w-4 h-4" /> Send Like</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SecretCrushDrawer 
        open={showCrushDrawer} 
        onClose={() => setShowCrushDrawer(false)} 
        onMatch={(matchJson, username) => {
          setShowCrushDrawer(false);
          setMatchData({
            open: true,
            matchedProfile: null,
            conversationId: matchJson.conversation_id,
            matchedUsername: username
          });
          setTimeout(() => {
            navigate(`/messages/${matchJson.conversation_id}`);
          }, 3500);
        }}
      />

      <MatchReveal 
        data={matchData} 
        myProfile={myProfile} 
      />

    </div>
  );
}

/* -- SUBCOMPONENTS -- */

function ProfileScroll({ profile, onHeartClick }: { profile: Profile, onHeartClick: (c: string, t: 'media'|'prompt') => void }) {
  const visibleVitals = Object.entries(profile.vitals || {}).filter(([_, data]) => data.visible && data.value);

  return (
    <div className="w-full mx-auto bg-white min-h-[100dvh]">
      {/* Block 1: Media 0 (Hero) */}
      <MediaBlock url={profile.media[0]} onHeart={() => onHeartClick(profile.media[0], 'media')} />
      
      {/* Name Name & Vitals */}
      <div className="px-6 py-10 bg-[#faf8f5]">
        <h1 className="font-editorial text-5xl text-[#2c2c2c] mb-6">{profile.user_details.display_name}</h1>
        {visibleVitals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleVitals.map(([key, data]) => (
              <span key={key} className="px-4 py-2 rounded-full bg-white border border-black/5 shadow-sm text-sm text-[#5a5a5a] font-medium">
                {data.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Block 2: Media 1 */}
      {profile.media[1] && <MediaBlock url={profile.media[1]} onHeart={() => onHeartClick(profile.media[1], 'media')} />}

      {/* Block 3: Prompts (Mocked here since phase 3 didn't implement prompt forms, we show placeholder if none) */}
      <div className="px-6 py-16 bg-white flex flex-col items-center justify-center text-center relative group">
        <HeartButton onClick={() => onHeartClick("A sunday well spent brings a week of content.", "prompt")} />
        <h3 className="font-sans text-xs uppercase tracking-widest text-[#a3a3a3] mb-4">A simple truth</h3>
        <p className="font-editorial text-4xl text-[#2c2c2c] leading-tight">
          "A sunday well spent brings a week of content."
        </p>
      </div>

      {/* Block 4: Media 2 */}
      {profile.media[2] && <MediaBlock url={profile.media[2]} onHeart={() => onHeartClick(profile.media[2], 'media')} />}

      {/* Block 5: Media 3 */}
      {profile.media[3] && <MediaBlock url={profile.media[3]} onHeart={() => onHeartClick(profile.media[3], 'media')} />}

      {/* Block 6: Media 4 */}
      {profile.media[4] && <MediaBlock url={profile.media[4]} onHeart={() => onHeartClick(profile.media[4], 'media')} />}
      
      <div className="h-12 bg-white" />
    </div>
  );
}

function MediaBlock({ url, onHeart }: { url: string, onHeart: () => void }) {
  const isVideo = url.endsWith('.mp4') || url.endsWith('.mov');
  return (
    <div className="relative w-full aspect-[4/5] bg-[#f0ece6] group">
      {isVideo ? (
        <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
      ) : (
        <img src={url} alt="Profile media" className="w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      <HeartButton onClick={onHeart} className="bottom-6 right-6 shadow-[0_8px_30px_rgb(0,0,0,0.2)]" />
    </div>
  );
}

function HeartButton({ onClick, className }: { onClick: () => void, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute z-10 w-14 h-14 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 flex items-center justify-center hover:bg-white/50 hover:scale-110 transition-all",
        className || "bottom-4 right-4"
      )}
    >
      <Heart className="w-6 h-6 text-white drop-shadow-md" fill="white" />
    </button>
  );
}

function OutofLikesState() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-[#f0ece6] flex items-center justify-center mb-8">
        <Clock className="w-10 h-10 text-[#5a5a5a]" />
      </div>
      <h2 className="font-editorial text-4xl mb-4 text-[#2c2c2c]">Patience</h2>
      <p className="text-[#6b6b6b] mb-8 font-sans">
        You have reached your limit of 4 likes for today.<br/>Absence makes the heart grow fonder.
      </p>
      <div className="px-8 py-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-mono text-2xl tracking-wider text-[#7C3AED]">
        {timeLeft || "00:00:00"}
      </div>
    </div>
  );
}

function EndofFeedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_60px_rgb(0,0,0,0.06)]">
        <div className="w-16 h-16 rounded-full bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-[#7C3AED]" />
        </div>
        <h2 className="font-editorial text-3xl mb-3 text-[#2c2c2c]">End of the Line</h2>
        <p className="text-[#6b6b6b] text-sm mb-8 leading-relaxed">
          You've seen everyone around you.<br/>Expand your horizons.
        </p>
        <button className="w-full py-4 rounded-full bg-gradient-to-r from-[#2c2c2c] to-[#1a1a1a] text-white font-medium shadow-xl hover:scale-[1.02] transition-transform">
          Get Tbuzz Passport
        </button>
      </div>
    </div>
  );
}

function SecretCrushDrawer({ open, onClose, onMatch }: { open: boolean, onClose: () => void, onMatch: (json: any, username: string) => void }) {
  const [crushUsername, setCrushUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!crushUsername.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("add_secret_crush", {
        p_crush_username: crushUsername.trim().toLowerCase()
      });
      if (error) throw error;
      
      setCrushUsername("");
      if (data && (data as any).is_match) {
        onMatch(data as any, crushUsername.trim());
      } else {
        toast.success("Secret crush saved. We won't tell.");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add crush.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
        >
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#faf8f5] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full">
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-1 bg-black/10 rounded-full mx-auto mb-6 sm:hidden" />
            
            <h3 className="font-editorial text-3xl mb-2 text-[#2c2c2c]">Secret Crushes</h3>
            <p className="text-[#6b6b6b] text-sm mb-6">
              Add up to 3 usernames. If they add you back, we'll start a private chat. They will never know unless it's mutual.
            </p>
            
            <input
              type="text"
              value={crushUsername}
              onChange={e => setCrushUsername(e.target.value)}
              placeholder="Enter their @username..."
              className="w-full bg-white border border-black/5 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 font-sans shadow-sm"
              autoCapitalize="none"
            />
            
            <button
              onClick={handleSubmit}
              disabled={loading || !crushUsername.trim()}
              className="w-full py-4 rounded-full bg-[#2c2c2c] text-white font-medium hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Secret"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MatchReveal({ data, myProfile }: { data: any, myProfile: any }) {
  if (!data?.open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-3xl overflow-hidden">
      <NeonSparkOverlay>
        <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 min-h-screen">
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", damping: 15 }}
            className="text-center mb-16 relative z-20"
          >
            <h1 className="font-editorial text-7xl text-white mb-4 italic tracking-wider">It's a Match.</h1>
            <p className="text-white/70 tracking-widest uppercase text-sm">The feeling is mutual</p>
          </motion.div>

          <div className="flex items-center justify-center gap-4 relative z-20">
            {/* My Avatar */}
            <motion.div
              initial={{ x: -100, opacity: 0, rotate: -10 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", damping: 15 }}
              className="w-32 h-32 rounded-full border-[4px] border-white/20 shadow-[0_0_40px_rgb(124,58,237,0.5)] overflow-hidden bg-black"
            >
              {myProfile?.avatar_url && <img src={myProfile.avatar_url} className="w-full h-full object-cover" />}
            </motion.div>

            {/* Heart burst triggers exactly when they collide */}
            <div className="relative w-0 h-0 flex items-center justify-center">
              <HeartBurst show={true} onComplete={() => {}} />
            </div>

            {/* Their Avatar */}
            <motion.div
              initial={{ x: 100, opacity: 0, rotate: 10 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", damping: 15 }}
              className="w-32 h-32 rounded-full border-[4px] border-white/20 shadow-[0_0_40px_rgb(124,58,237,0.5)] overflow-hidden bg-black flex items-center justify-center"
            >
              {data.matchedProfile?.user_details?.avatar_url ? (
                <img src={data.matchedProfile.user_details.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs opacity-50">@{data.matchedUsername}</span>
              )}
            </motion.div>
          </div>

        </div>
      </NeonSparkOverlay>
    </div>
  );
}
