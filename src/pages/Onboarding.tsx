import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const DEPARTMENTS = [
  "Computer Science", "Engineering", "Mathematics", "Physics", "Chemistry",
  "Biology", "Business", "Economics", "Psychology", "Law", "Medicine",
  "Arts", "Design", "Architecture", "Education", "Other",
];
const STREAMS = [
  "Data Science", "AI/ML", "Cybersecurity", "Software Engineering",
  "Mechanical", "Electrical", "Civil", "Chemical", "Biomedical",
  "Finance", "Marketing", "General", "Other",
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [anonymousAlias, setAnonymousAlias] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [stream, setStream] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [universityName, setUniversityName] = useState("");

  useEffect(() => {
    if (profile) { navigate("/feed", { replace: true }); return; }
    if (user) {
      const domain = user.email?.split("@")[1];
      if (domain) {
        supabase.from("universities").select("name").contains("email_domains", [domain]).maybeSingle().then(({ data }) => { if (data) setUniversityName(data.name); });
      }
    }
  }, [profile, user, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!anonymousAlias.trim()) { toast.error("Please choose an anonymous alias!"); return; }
    setLoading(true);
    try {
      const domain = user.email?.split("@")[1];
      const { data: uni } = await supabase.from("universities").select("id").contains("email_domains", [domain!]).single();
      if (!uni) throw new Error("University not found for your email domain.");
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = publicUrl.publicUrl;
      }
      const { error } = await supabase.from("profiles").insert({
        user_id: user.id, university_id: uni.id, display_name: displayName, bio,
        avatar_url: avatarUrl, anonymous_alias: anonymousAlias.trim(),
        year: year || null, department: department || null, stream: stream || null,
      });
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile created! Welcome to T");
      navigate("/feed", { replace: true });
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Set up your profile</h1>
          {universityName && <p className="mt-1 text-sm text-muted-foreground">{universityName}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <Avatar className="h-20 w-20 ring-2 ring-border group-hover:ring-primary transition-all">
                  {avatarPreview ? <AvatarImage src={avatarPreview} /> : <AvatarFallback className="bg-muted"><Camera className="h-6 w-6 text-muted-foreground" /></AvatarFallback>}
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-foreground p-1.5">
                  <Camera className="h-3 w-3 text-background" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should we call you?" required className="h-10 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Anonymous Alias</Label>
              <Input value={anonymousAlias} onChange={(e) => setAnonymousAlias(e.target.value)} placeholder="e.g. ShadowFox, NeonPanda..." required maxLength={20} className="h-10 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">This will be your permanent gossip identity. Choose wisely!</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={2} className="rounded-xl bg-muted border border-border resize-none text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="bg-muted border border-border text-xs h-9 rounded-xl text-foreground"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent className="bg-elevated border-border">{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Dept</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="bg-muted border border-border text-xs h-9 rounded-xl text-foreground"><SelectValue placeholder="Dept" /></SelectTrigger>
                  <SelectContent className="bg-elevated border-border">{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Stream</Label>
                <Select value={stream} onValueChange={setStream}>
                  <SelectTrigger className="bg-muted border border-border text-xs h-9 rounded-xl text-foreground"><SelectValue placeholder="Stream" /></SelectTrigger>
                  <SelectContent className="bg-elevated border-border">{STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <button type="submit" disabled={loading || !displayName || !anonymousAlias.trim()} className="w-full h-11 rounded-full bg-foreground text-background font-semibold text-sm disabled:opacity-40 transition-transform active:scale-[0.98]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Let's Go"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
