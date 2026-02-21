import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogOut, Edit2, Save, Users, Trophy, Loader2, X, Camera } from "lucide-react";

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
      toast.success("Profile updated! ✨");
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
    toast.success("Avatar updated! 📸");
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
          {/* Banner */}
          <div className="h-24 gradient-primary relative" />

          <CardContent className="-mt-12 relative">
            {/* Avatar */}
            <div className="flex justify-between items-start">
              <label className="relative cursor-pointer group">
                <Avatar className="h-20 w-20 ring-4 ring-card">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted text-xl font-bold">
                      {profile.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-3 w-3 text-primary-foreground" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <Button
                variant="outline"
                size="sm"
                className="mt-14 border-border/50"
                onClick={() => editing ? handleSave() : setEditing(true)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  <><Save className="h-4 w-4 mr-1" /> Save</>
                ) : (
                  <><Edit2 className="h-4 w-4 mr-1" /> Edit</>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="mt-3">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-muted/50 border-border/50 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold">{profile.display_name}</h2>
                  {universityName && (
                    <p className="text-sm text-secondary">{universityName}</p>
                  )}
                  {profile.bio && (
                    <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-4 flex gap-6">
              <div className="text-center">
                <p className="font-bold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="outline" className="text-xs border-primary/30 text-primary">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
