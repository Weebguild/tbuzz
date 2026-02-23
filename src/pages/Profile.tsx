import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence, animate } from "framer-motion";
import { Grid, LayoutList, Heart, MapPin, Calendar, Loader2, LogOut, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PostImageExpander } from "@/components/feed/PostImageExpander";

// ── CUSTOM COMPONENT: SMOOTH COUNTING ANIMATION ──
function AnimatedNumber({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = Math.round(v).toString();
        },
      });
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef}>{value}</span>;
}

interface ProfileData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  year: string | null;
}

interface PhotoPost {
  id: string;
  image_url: string;
  reaction_count: number;
}

interface TextPost {
  id: string;
  content: string;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  has_liked: boolean;
}

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUserId = id || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [photos, setPhotos] = useState<PhotoPost[]>([]);
  const [textPosts, setTextPosts] = useState<TextPost[]>([]);

  // NEW STATE: Follower Stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "gallery">("posts");
  const [expandedPhoto, setExpandedPhoto] = useState<PhotoPost | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!targetUserId) return;

    // 1. Fetch Profile Info
    const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", targetUserId).single();

    if (profileData) setProfile(profileData);

    // 2. Fetch Follower / Following Counts
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_user_id", targetUserId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", targetUserId),
    ]);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    // 3. Fetch Photos (Posts with images)
    const { data: photoPosts } = await supabase
      .from("posts")
      .select("id, image_url")
      .eq("user_id", targetUserId)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });

    // 4. Fetch Text Posts (Posts without images)
    const { data: textPostsData } = await supabase
      .from("posts")
      .select("id, content, created_at")
      .eq("user_id", targetUserId)
      .is("image_url", null)
      .order("created_at", { ascending: false });

    // Fetch reactions and comments for all fetched posts
    const allPostIds = [...(photoPosts?.map((p) => p.id) || []), ...(textPostsData?.map((p) => p.id) || [])];

    if (allPostIds.length > 0) {
      const [{ data: reactions }, { data: comments }] = await Promise.all([
        supabase.from("reactions").select("post_id, user_id").in("post_id", allPostIds),
        supabase.from("comments").select("post_id").in("post_id", allPostIds),
      ]);

      if (photoPosts) {
        setPhotos(
          photoPosts.map((photo) => ({
            ...photo,
            reaction_count: reactions?.filter((r) => r.post_id === photo.id).length || 0,
          })),
        );
      }

      if (textPostsData) {
        setTextPosts(
          textPostsData.map((post) => ({
            ...post,
            reaction_count: reactions?.filter((r) => r.post_id === post.id).length || 0,
            comment_count: comments?.filter((c) => c.post_id === post.id).length || 0,
            has_liked: reactions?.some((r) => r.post_id === post.id && r.user_id === user?.id) || false,
          })),
        );
      }
    }

    setLoading(false);
  }, [targetUserId, user?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;

    setTextPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, has_liked: !hasLiked, reaction_count: hasLiked ? p.reaction_count - 1 : p.reaction_count + 1 }
          : p,
      ),
    );

    if (hasLiked) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, post_id: postId, reaction_type: "like" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen flex justify-center items-center text-muted-foreground">User not found.</div>;
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-4xl tracking-widest text-foreground uppercase drop-shadow-md">Profile</h1>
        {isOwnProfile && (
          <button
            onClick={() => toast("Logout confirmation coming soon!")}
            className="h-10 w-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── PROFILE INFO CARD (Midnight Glass) ── */}
      <div className="rounded-3xl glass-panel p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          <Avatar className="h-24 w-24 ring-4 ring-white/10 shadow-[0_0_30px_rgba(124,58,237,0.3)] mb-4">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-[#0A0A0A] text-2xl font-bold text-foreground">
                {profile.display_name.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>

          <h2 className="text-2xl font-bold text-foreground mb-1">{profile.display_name}</h2>

          <div className="flex items-center justify-center gap-3 text-xs font-medium text-muted-foreground/80 mb-4">
            {profile.department && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.department}
              </span>
            )}
            {profile.year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {profile.year}
              </span>
            )}
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed max-w-[280px]">
            {profile.bio || "No bio added yet."}
          </p>

          {/* ── FOLLOWER STATS (Animated) ── */}
          <div className="flex items-center justify-center gap-8 mt-6 pt-5 border-t border-white/5 w-full">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-display text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <AnimatedNumber value={followersCount} />
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">
                Followers
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col items-center">
              <span className="text-3xl font-display text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <AnimatedNumber value={followingCount} />
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">
                Following
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-6 p-1 glass-panel rounded-full max-w-[200px] mx-auto">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "posts" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white/70"}`}
        >
          <LayoutList className="h-4 w-4" /> Posts
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === "gallery" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white/70"}`}
        >
          <Grid className="h-4 w-4" /> Gallery
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        {/* TEXT POSTS FEED */}
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {textPosts.length === 0 ? (
              <div className="py-20 text-center">
                <LayoutList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No text posts yet.</p>
              </div>
            ) : (
              textPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl glass-panel p-4 hover:border-primary/30 transition-colors duration-500"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9 ring-1 ring-white/10">
                      {profile.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                          {profile.display_name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{profile.display_name}</p>
                      <p className="text-xs text-muted-foreground/80">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground/90 mb-4">{post.content}</p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post.id, post.has_liked)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${post.has_liked ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                      {post.reaction_count > 0 && <span className="text-xs font-medium">{post.reaction_count}</span>}
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      {post.comment_count > 0 && <span className="text-xs font-medium">{post.comment_count}</span>}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* GALLERY GRID */}
        {activeTab === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 gap-3"
          >
            {photos.length === 0 ? (
              <div className="col-span-2 py-20 text-center">
                <Grid className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No photos uploaded yet.</p>
              </div>
            ) : (
              photos.map((photo, i) => {
                const isWide = i % 3 === 0;
                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative overflow-hidden rounded-3xl glass-panel group cursor-pointer border border-white/5 ${isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"}`}
                    onClick={() => setExpandedPhoto(photo)}
                  >
                    <img
                      src={photo.image_url}
                      alt="Gallery"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div className="flex items-center gap-1.5 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Heart className="h-4 w-4 text-[#EC4899] fill-[#EC4899] drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                        <span className="text-xs font-bold text-white">{photo.reaction_count}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SPLIT-SCREEN IMAGE EXPANDER ── */}
      <AnimatePresence>
        {expandedPhoto && (
          <PostImageExpander
            postId={expandedPhoto.id}
            imageUrl={expandedPhoto.image_url}
            hasLiked={false}
            reactionCount={expandedPhoto.reaction_count}
            commentCount={0}
            onClose={() => setExpandedPhoto(null)}
            onToggleLike={() => {
              toast.success("Liked from profile!");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
