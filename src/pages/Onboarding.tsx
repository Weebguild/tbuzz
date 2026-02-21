import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Camera, X, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const INTEREST_OPTIONS = [
  "Music", "Sports", "Gaming", "Art", "Tech", "Fashion",
  "Film", "Travel", "Food", "Fitness", "Books", "Photography",
  "Dance", "Comedy", "Science", "Politics",
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [universityName, setUniversityName] = useState("");

  useEffect(() => {
    if (profile) {
      navigate("/feed", { replace: true });
      return;
    }
    if (user) {
      const domain = user.email?.split("@")[1];
      if (domain) {
        supabase
          .from("universities")
          .select("name")
          .contains("email_domains", [domain])
          .maybeSingle()
          .then(({ data }) => {
            if (data) setUniversityName(data.name);
          });
      }
    }
  }, [profile, user, navigate]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const domain = user.email?.split("@")[1];
      const { data: uni } = await supabase
        .from("universities")
        .select("id")
        .contains("email_domains", [domain!])
        .single();

      if (!uni) throw new Error("University not found for your email domain.");

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        university_id: uni.id,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        interests,
      });

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile created! Welcome to T 🎉");
      navigate("/feed", { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
          <h1 className="font-display text-2xl font-bold">Set up your profile</h1>
          {universityName && (
            <p className="mt-1 text-sm text-secondary">{universityName}</p>
          )}
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer group">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/30 group-hover:ring-primary transition-all">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 rounded-full gradient-primary p-1.5">
                    <Camera className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What should we call you?"
                  required
                  className="bg-muted/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="bg-muted/50 border-border/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Interests</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <Badge
                      key={interest}
                      variant={interests.includes(interest) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        interests.includes(interest)
                          ? "gradient-primary border-0"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                      {interests.includes(interest) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !displayName}
                className="w-full gradient-primary border-0 font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Let's Go 🚀"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
