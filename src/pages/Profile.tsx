import { PostImageExpander } from "@/components/feed/PostImageExpander";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Grid, LayoutList, Heart, MapPin, Calendar, Loader2, LogOut } from "lucide-react";

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

export default function Profile() {
  const { id } = useParams(); // Get user ID from URL if visiting someone else
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUserId = id || user?.id;
  const isOwnProfile = targetUserId === user?.id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [photos, setPhotos] = useState<PhotoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "gallery">("gallery");
  const [expandedPhoto, setExpandedPhoto] = useState<PhotoPost | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) return;
      setLoading(true);

      // 1. Fetch Profile Info
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", targetUserId).single();

      if (profileData) setProfile(profileData);

      // 2. Fetch Only Posts With Images for the Gallery
      const { data: photoPosts } = await supabase
        .from("posts")
        .select("id, image_url")
        .eq("user_id", targetUserId)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });

      if (photoPosts) {
        // Fetch reaction counts for these photos
        const postIds = photoPosts.map((p) => p.id);
        const { data: reactions } = await supabase.from("reactions").select("post_id").in("post_id", postIds);

        const enrichedPhotos = photoPosts.map((photo) => ({
          ...photo,
          reaction_count: reactions?.filter((r) => r.post_id === photo.id).length || 0,
        }));
        setPhotos(enrichedPhotos);
      }

      setLoading(false);
    };

    fetchProfileData();
  }, [targetUserId]);

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
            onClick={() => {
              /* We will add the custom logout dialog here later */
            }}
            className="h-10 w-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── PROFILE INFO CARD (Midnight Glass) ── */}
      <div className="rounded-3xl glass-panel p-6 mb-6 relative overflow-hidden">
        {/* Subtle background glow for the profile card */}
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

      {/* ── GALLERY VIEW (The Editorial Bento Grid) ── */}
      <AnimatePresence mode="wait">
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
                // Editorial Grid Logic: Every 3rd image is a cinematic wide shot
                const isWide = i % 3 === 0;

                return (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative overflow-hidden rounded-3xl glass-panel group cursor-pointer border border-white/5 ${isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"}`}
                    // ── REPLACE THE ONCLICK WITH THIS ──
                    onClick={() => setExpandedPhoto(photo)}
                  >
                    <img
                      src={photo.image_url}
                      alt="Gallery"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Dark gradient overlay on hover */}
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

        {/* Placeholder for 'Posts' tab content */}
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-20"
          >
            <p className="text-sm text-muted-foreground font-medium">Text posts feed goes here.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD THIS ENTIRE BLOCK HERE ── */}
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
              /* Profile-specific toggle like function */
            }}
          />
        )}
      </AnimatePresence>
      {/* ── END OF NEW BLOCK ── */}
    </div>
  );
}
