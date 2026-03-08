import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/sanitize-error";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Camera, ArrowRight, ArrowLeft, Check } from "lucide-react";
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

const STEPS = [
  { title: "Your Identity", subtitle: "Choose how you'll be known" },
  { title: "Your Look", subtitle: "Show them who you are" },
  { title: "Your Details", subtitle: "Almost there..." },
];

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
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

  const goNext = () => {
    if (step === 0 && (!displayName.trim() || !anonymousAlias.trim())) {
      toast.error("Please fill in both username and alias!");
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
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
      toast.success("Profile created! Welcome to T");
      navigate("/feed", { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      if (error.code === "23505") {
        toast.error("This username is already taken. Please choose another one.");
      } else {
        toast.error(sanitizeError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Set up your profile</h1>
          {universityName && <p className="mt-1 text-sm text-muted-foreground">{universityName}</p>}
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          ))}
        </div>

        <div className="rounded-2xl glass-panel bg-black/40 backdrop-blur-xl p-6 overflow-hidden">
          {/* Step title */}
          <div className="mb-5 text-center">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Step {step + 1} of 3</p>
            <h2 className="text-lg font-bold text-foreground mt-1">{STEPS[step].title}</h2>
            <p className="text-xs text-muted-foreground">{STEPS[step].subtitle}</p>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Username</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Choose a unique username" required className="h-10 rounded-xl bg-black/30 border border-white/10 text-foreground placeholder:text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">This is how students will find and mention you.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Anonymous Alias</Label>
                  <Input value={anonymousAlias} onChange={(e) => setAnonymousAlias(e.target.value)} placeholder="e.g. ShadowFox, NeonPanda..." required maxLength={20} className="h-10 rounded-xl bg-black/30 border border-white/10 text-foreground placeholder:text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">Your permanent gossip identity. Choose wisely!</p>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <label className="relative cursor-pointer group">
                    <Avatar className="h-24 w-24 ring-2 ring-white/10 group-hover:ring-primary transition-all">
                      {avatarPreview ? <AvatarImage src={avatarPreview} /> : <AvatarFallback className="bg-black/30"><Camera className="h-6 w-6 text-muted-foreground" /></AvatarFallback>}
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-foreground p-1.5">
                      <Camera className="h-3 w-3 text-background" />
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} className="rounded-xl bg-black/30 border border-white/10 resize-none text-foreground placeholder:text-muted-foreground" />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="bg-black/30 border border-white/10 h-10 rounded-xl text-foreground"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="bg-black/30 border border-white/10 h-10 rounded-xl text-foreground"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stream</Label>
                  <Select value={stream} onValueChange={setStream}>
                    <SelectTrigger className="bg-black/30 border border-white/10 h-10 rounded-xl text-foreground"><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">{STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 gap-3">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                onClick={goNext}
                disabled={step === 0 && (!displayName.trim() || !anonymousAlias.trim())}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 transition-transform active:scale-[0.98]"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !displayName || !anonymousAlias.trim()}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-40 transition-transform active:scale-[0.98] shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Let's Go</>}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
