import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogOut, Edit2, Save, Loader2, Camera, GraduationCap, BookOpen, Layers } from "lucide-react";
import Counter from "@/components/Counter";

interface ViewProfile {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  anonymous_alias: string | null;
  year: string | null;
  department: string | null;
  stream: string | null;
  university_id: string;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;

  const [viewProfile, setViewProfile] = useState<ViewProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [universityName, setUniversityName] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const targetProfile = isOwnProfile ? profile : viewProfile;
  const targetUserId = isOwnProfile ? user?.id : userId;

  useEffect(() => {
    if (isOwnProfile && profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setLoadingProfile(false);
    } else if (userId) {
      fetchOtherProfile(userId);
    }
  }, [profile, userId]);

  useEffect(() => {
    if (targetUserId && targetProfile) {
      fetchCounts(targetUserId);
      fetchUniversity(targetProfile.university_id);
      if (!isOwnProfile && user) checkFollowing(targetUserId);
    }
  }, [targetProfile, targetUserId]);

  const fetchOtherProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    if (data) setViewProfile(data);
    setLoadingProfile(false);
  };

  const fetchCounts = async (uid: string) => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_user_id", uid),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", uid),
    ]);
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);
  };

  const fetchUniversity = async (uniId: string) => {
    const { data } = await supabase.from("universities").select("name").eq("id", uniId).single();
    if (data) setUniversityName(data.name);
  };

  const checkFollowing = async (uid: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_user_id", user.id)
      .eq("following_user_id", uid)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user || !targetUserId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", targetUserId);
    } else {
      await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: targetUserId });
    }
    setIsFollowing(!isFollowing);
    fetchCounts(targetUserId);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      refreshProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    navigate("/avatar-crop", { state: { file, returnTo: isOwnProfile ? "/profile" : `/profile/${userId}` } });
  };

  if (loadingProfile || !targetProfile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Profile</h1>
        {isOwnProfile && (
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="h-24 bg-muted relative" />

          <div className="px-5 -mt-12 pb-5">
            <div className="flex justify-between items-start">
              {isOwnProfile ? (
                <label className="relative cursor-pointer group">
                  <Avatar className="h-20 w-20 ring-4 ring-primary/30">
                    {targetProfile.avatar_url ? (
                      <AvatarImage src={targetProfile.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-muted text-xl font-extrabold text-foreground">
                        {targetProfile.display_name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0 rounded-full bg-foreground p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-3 w-3 text-background" />
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              ) : (
                <Avatar className="h-20 w-20 ring-4 ring-primary/30">
                  {targetProfile.avatar_url ? (
                    <AvatarImage src={targetProfile.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted text-xl font-extrabold text-foreground">
                      {targetProfile.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}
              {isOwnProfile ? (
                <button
                  className="mt-14 px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  onClick={() => (editing ? handleSave() : setEditing(true))}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editing ? (
                    <span className="flex items-center gap-1">
                      <Save className="h-3.5 w-3.5" /> Save
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={toggleFollow}
                  className={`mt-14 px-5 py-1.5 rounded-full text-xs font-semibold transition-colors ${isFollowing ? "border border-border text-muted-foreground" : "bg-foreground text-background"}`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>

            <div className="mt-3">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-10 rounded-xl bg-muted border-0 text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="rounded-xl bg-muted border-0 resize-none text-foreground"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-extrabold text-foreground">{targetProfile.display_name}</h2>
                  {isOwnProfile && targetProfile.anonymous_alias && (
                    <p className="text-xs text-primary font-semibold mt-0.5">🎭 {targetProfile.anonymous_alias}</p>
                  )}
                  {universityName && <p className="text-sm text-muted-foreground">{universityName}</p>}
                  {targetProfile.bio && (
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{targetProfile.bio}</p>
                  )}
                </>
              )}
            </div>

            {(targetProfile.year || targetProfile.department || targetProfile.stream) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {targetProfile.year && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <GraduationCap className="h-3 w-3" /> {targetProfile.year}
                  </span>
                )}
                {targetProfile.department && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <BookOpen className="h-3 w-3" /> {targetProfile.department}
                  </span>
                )}
                {targetProfile.stream && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <Layers className="h-3 w-3" /> {targetProfile.stream}
                  </span>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-8">
              <div>
                <Counter targetValue={followerCount} delay={0} className="text-lg font-extrabold text-foreground" />
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div>
                <Counter targetValue={followingCount} delay={200} className="text-lg font-extrabold text-foreground" />
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
