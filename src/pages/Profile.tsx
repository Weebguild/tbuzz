import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogOut, Edit2, Save, Loader2, Camera, GraduationCap, BookOpen, Layers } from "lucide-react";

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [universityName, setUniversityName] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      fetchCounts();
      fetchUniversity();
    }
  }, [profile]);

  const fetchCounts = async () => {
    if (!user) return;
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_user_id", user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", user.id),
    ]);
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);
  };

  const fetchUniversity = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("universities")
      .select("name")
      .eq("id", profile.university_id)
      .single();
    if (data) setUniversityName(data.name);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      refreshProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", user.id);
    refreshProfile();
    toast.success("Avatar updated!");
  };

  if (!profile) {
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
        <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-muted relative" />

          <div className="px-5 -mt-12 pb-5">
            <div className="flex justify-between items-start">
              <label className="relative cursor-pointer group">
                <Avatar className="h-20 w-20 ring-4 ring-background">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted text-xl font-extrabold">
                      {profile.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 rounded-full bg-foreground p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-3 w-3 text-background" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <button
                className="mt-14 px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                onClick={() => editing ? handleSave() : setEditing(true)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  <span className="flex items-center gap-1"><Save className="h-3.5 w-3.5" /> Save</span>
                ) : (
                  <span className="flex items-center gap-1"><Edit2 className="h-3.5 w-3.5" /> Edit</span>
                )}
              </button>
            </div>

            <div className="mt-3">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-10 rounded-xl bg-muted border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="rounded-xl bg-muted border-0 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-extrabold">{profile.display_name}</h2>
                  {profile.anonymous_alias && (
                    <p className="text-xs text-primary font-semibold mt-0.5">🎭 {profile.anonymous_alias}</p>
                  )}
                  {universityName && (
                    <p className="text-sm text-muted-foreground">{universityName}</p>
                  )}
                  {profile.bio && (
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                  )}
                </>
              )}
            </div>

            {/* Academic Info */}
            {(profile.year || profile.department || profile.stream) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.year && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <GraduationCap className="h-3 w-3" /> {profile.year}
                  </span>
                )}
                {profile.department && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <BookOpen className="h-3 w-3" /> {profile.department}
                  </span>
                )}
                {profile.stream && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs font-medium text-foreground">
                    <Layers className="h-3 w-3" /> {profile.stream}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="mt-5 flex gap-8">
              <div>
                <p className="text-lg font-extrabold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="text-lg font-extrabold">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
