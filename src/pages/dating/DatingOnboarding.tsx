import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, X, Plus, ChevronRight, ChevronLeft,
  Volume2, VolumeX, Eye, EyeOff, Check
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────── */
/*  TYPES                                        */
/* ──────────────────────────────────────────── */

interface VitalField { value: string; visible: boolean }

interface Vitals {
  age: VitalField;
  gender: VitalField;
  pronouns: VitalField;
  year: VitalField;
  major: VitalField;
  height: VitalField;
  relationship_type: VitalField;
  lifestyle: VitalField;
  intentions: VitalField;
}

interface Prompt { question: string; answer: string }

const ALL_PROMPTS = [
  "The way to my heart is...",
  "My love language is...",
  "We'd get along if you...",
  "I'm looking for someone who...",
  "My guilty pleasure is...",
  "Together we would...",
  "I'll know it's a match when...",
  "A green flag I look for...",
  "Change my mind about...",
  "Best piece of advice I've gotten...",
  "Sunday morning means...",
  "Unpopular opinion I stand by...",
];

/* ──────────────────────────────────────────── */
/*  MAIN PAGE COMPONENT                          */
/* ──────────────────────────────────────────── */

export default function DatingOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("dating_profiles")
        .select("id, media, vitals, prompts, is_active")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) setExistingData(data);
      setChecking(false);
    };
    check();
  }, [user]);

  if (checking) {
    return (
      <div className="dating-world flex items-center justify-center min-h-[100dvh]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
    );
  }

  return <OnboardingForm userId={user?.id} existing={existingData} />;
}

/* ──────────────────────────────────────────── */
/*  MULTI-STEP FORM                              */
/* ──────────────────────────────────────────── */

function OnboardingForm({ userId, existing }: { userId?: string; existing?: any }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media state
  const [media, setMedia] = useState<{ id: string; file?: File; type: "image" | "video"; preview: string; uploaded?: string }[]>(
    () => {
      if (existing?.media && Array.isArray(existing.media)) {
        return (existing.media as string[]).map((url, i) => ({
          id: `existing-${i}`,
          type: url.endsWith(".mp4") || url.endsWith(".mov") ? "video" : "image" as "image",
          preview: url,
          uploaded: url,
        }));
      }
      return [];
    }
  );

  // Vitals state
  const [vitals, setVitals] = useState<Vitals>(() => {
    const def: Vitals = {
      age: { value: "", visible: true },
      gender: { value: "", visible: true },
      pronouns: { value: "", visible: true },
      year: { value: "", visible: true },
      major: { value: "", visible: true },
      height: { value: "", visible: true },
      relationship_type: { value: "", visible: true },
      lifestyle: { value: "", visible: true },
      intentions: { value: "", visible: true },
    };
    if (existing?.vitals) {
      return { ...def, ...existing.vitals };
    }
    return def;
  });

  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>(() => {
    if (existing?.prompts && typeof existing.prompts === "object") {
      return Object.entries(existing.prompts).map(([q, a]) => ({ question: q, answer: a as string }));
    }
    return [{ question: "", answer: "" }, { question: "", answer: "" }];
  });

  const steps = ["Gallery", "About You", "Prompts", "Review"];
  const canNext = [
    media.length >= 1,
    vitals.gender.value.trim() !== "" && vitals.year.value.trim() !== "",
    prompts.every(p => p.question && p.answer.trim().length > 0),
    true,
  ];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleMediaAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (media.length + files.length > 5) {
      toast.error("Maximum 5 pieces of media.");
      return;
    }
    const items = files.map(file => ({
      id: Math.random().toString(36).slice(7),
      file,
      type: file.type.startsWith("video/") ? "video" as const : "image" as const,
      preview: URL.createObjectURL(file),
    }));
    setMedia(prev => [...prev, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id));

  const setVital = (key: keyof Vitals, field: "value" | "visible", val: any) =>
    setVitals(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));

  const handleSubmit = async () => {
    if (media.length < 1) { toast.error("Add at least 1 photo."); return; }
    if (!prompts.every(p => p.question && p.answer.trim())) {
      toast.error("Complete both prompts."); return;
    }
    setUploading(true);
    try {
      // Upload only new files
      const mediaUrls = await Promise.all(
        media.map(async item => {
          if (item.uploaded) return item.uploaded;
          const ext = item.file!.name.split(".").pop() || (item.type === "video" ? "mp4" : "jpg");
          const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("dating_media").upload(fileName, item.file!);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("dating_media").getPublicUrl(fileName);
          return pub.publicUrl;
        })
      );

      const promptsMap = Object.fromEntries(prompts.map(p => [p.question, p.answer]));

      const { error } = await supabase
        .from("dating_profiles")
        .upsert({ id: userId, media: mediaUrls, vitals: vitals as any, prompts: promptsMap, is_active: true });

      if (error) throw error;
      toast.success("Profile live! Go find your person.");
      navigate("/dating/discover");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dating-world min-h-[100dvh] flex flex-col">
      {/* ── PROGRESS HEADER ── */}
      <div className="sticky top-0 z-20 liquid-glass border-b border-white/5 px-5 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className={cn("transition-opacity", step === 0 ? "opacity-0 pointer-events-none" : "opacity-40 hover:opacity-100")}
              style={{ color: "white" }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <p className="font-editorial text-lg text-white">
              {steps[step]}
            </p>
            <div className="w-6" />
          </div>
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn("dw-step-dot transition-all duration-500", i === step ? "dw-step-dot-active" : i < step ? "bg-amber-500/40" : "bg-white/10")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── STEP CONTENT ── */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-md mx-auto px-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <GalleryStep
                  media={media}
                  onAdd={() => fileInputRef.current?.click()}
                  onRemove={removeMedia}
                />
              )}
              {step === 1 && (
                <AboutStep vitals={vitals} setVital={setVital} />
              )}
              {step === 2 && (
                <PromptsStep prompts={prompts} setPrompts={setPrompts} />
              )}
              {step === 3 && (
                <ReviewStep media={media} vitals={vitals} prompts={prompts} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/mp4,video/quicktime"
        multiple
        onChange={handleMediaAdd}
      />

      {/* ── BOTTOM CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 liquid-glass border-t border-white/5 px-5 py-6">
        <div className="max-w-md mx-auto">
          {step < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canNext[step]}
              className="dw-btn-liquid w-full py-5 flex items-center justify-center gap-2 font-bold disabled:opacity-20 disabled:pointer-events-none"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="dw-btn-liquid w-full py-5 flex items-center justify-center gap-2 font-bold"
            >
              {uploading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <><Check className="w-5 h-5" /> Go Live</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  STEP 1 — GALLERY                            */
/* ──────────────────────────────────────────── */

function GalleryStep({ media, onAdd, onRemove }: {
  media: any[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="pt-10 pb-4">
      <h1 className="font-editorial text-5xl text-white mb-2">
        Your Gallery
      </h1>
      <p className="text-sm mb-10 text-white/40">
        Up to 5 photos or short videos. Your first photo is your hero shot.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {media.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "relative overflow-hidden rounded-[2rem] bg-stone-900 border border-white/5",
                i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]"
              )}
            >
              {item.type === "video"
                ? <VideoPreview src={item.preview} />
                : <img src={item.preview} alt="" className="w-full h-full object-cover" />
              }
              <button
                onClick={() => onRemove(item.id)}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white"
                  style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}>
                  Cover Photo
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {media.length < 5 && (
          <motion.button
            layout
            onClick={onAdd}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:bg-stone-50 active:scale-97",
              media.length === 0 ? "col-span-2 aspect-[4/5]" : ""
            )}
            style={{ borderColor: "hsl(var(--dw-border))", background: "hsl(var(--dw-bg-alt))" }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "hsl(340 75% 55% / 0.1)" }}>
              <Plus className="w-5 h-5" style={{ color: "hsl(var(--dw-accent))" }} />
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "hsl(var(--dw-text-soft))" }}>
              Add Photo/Video
            </span>
          </motion.button>
        )}
      </div>

      <p className="text-xs text-center mt-4" style={{ color: "hsl(var(--dw-text-soft))" }}>
        Videos loop automatically on mute · tap to unmute
      </p>

      {/* Count badge */}
      <div className="flex items-center justify-center mt-4 gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i < media.length ? "20px" : "6px",
              background: i < media.length ? "hsl(var(--dw-accent))" : "hsl(var(--dw-border))",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  STEP 2 — ABOUT YOU                          */
/* ──────────────────────────────────────────── */

const genderOptions = ["Man", "Woman", "Non-binary", "Other"];
const pronounOptions = ["He / Him", "She / Her", "They / Them", "Ask Me"];
const yearOptions = ["Freshman", "Sophomore", "Junior", "Senior", "Grad Student"];
const relationshipOptions = ["Something casual", "Dating around", "Long-term", "Open to anything"];
const lifestyleOptions = ["Homebody", "Social butterfly", "Night owl", "Early bird", "Gym rat", "Bookworm", "Foodie", "Artist", "Gamer", "Traveller"];
const intentionOptions = ["Here to date", "Open to friendship", "Just vibing"];

function AboutStep({ vitals, setVital }: {
  vitals: Vitals;
  setVital: (key: keyof Vitals, field: "value" | "visible", val: any) => void;
}) {
  const chip = (key: keyof Vitals, opt: string) => (
    <button
      key={opt}
      onClick={() => setVital(key, "value", vitals[key].value === opt ? "" : opt)}
      className={cn("dw-chip transition-all", vitals[key].value === opt && "dw-chip-active")}
    >
      {opt}
    </button>
  );

  const multiChip = (key: keyof Vitals, opt: string) => {
    const selected = vitals[key].value.split(",").map(s => s.trim()).filter(Boolean);
    const isActive = selected.includes(opt);
    return (
      <button
        key={opt}
        onClick={() => {
          const next = isActive
            ? selected.filter(s => s !== opt)
            : selected.length < 4 ? [...selected, opt] : selected;
          setVital(key, "value", next.join(", "));
        }}
        className={cn("dw-chip transition-all", isActive && "dw-chip-active")}
      >
        {opt}
      </button>
    );
  };

  return (
    <div className="pt-10 pb-4 space-y-10">
      <div>
        <h1 className="font-editorial text-5xl text-white mb-2">About You</h1>
        <p className="text-sm text-white/40">Help us find your people.</p>
      </div>

      {/* Age */}
      <Section label="Age">
          <input
            type="number"
            min={18} max={30}
            value={vitals.age.value}
            onChange={e => setVital("age", "value", e.target.value)}
            placeholder="Age"
            className="w-32 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
          />
        </Section>
  
        {/* Gender */}
        <Section label="Gender" required>
          <div className="flex flex-wrap gap-2.5">
            {genderOptions.map(o => chip("gender", o))}
          </div>
        </Section>
  
        {/* Pronouns */}
        <Section label="Pronouns">
          <div className="flex flex-wrap gap-2.5">
            {pronounOptions.map(o => chip("pronouns", o))}
          </div>
        </Section>
  
        {/* Year */}
        <Section label="Year" required>
          <div className="flex flex-wrap gap-2.5">
            {yearOptions.map(o => chip("year", o))}
          </div>
        </Section>
  
        {/* Major */}
        <Section label="Major">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={vitals.major.value}
              onChange={e => setVital("major", "value", e.target.value)}
              placeholder="e.g. Architecture"
              className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
            />
            <VisToggle visible={vitals.major.visible} onToggle={() => setVital("major", "visible", !vitals.major.visible)} />
          </div>
        </Section>
  
        {/* Height */}
        <Section label="Height">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={vitals.height.value}
              onChange={e => setVital("height", "value", e.target.value)}
              placeholder={`e.g. 5'10"`}
              className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
            />
            <VisToggle visible={vitals.height.visible} onToggle={() => setVital("height", "visible", !vitals.height.visible)} />
          </div>
        </Section>

      {/* Relationship type */}
      <Section label="Looking for">
        <div className="flex flex-wrap gap-2">
          {relationshipOptions.map(o => chip("relationship_type", o))}
        </div>
      </Section>

      {/* Lifestyle */}
      <Section label="Lifestyle" sub="Pick up to 4">
        <div className="flex flex-wrap gap-2">
          {lifestyleOptions.map(o => multiChip("lifestyle", o))}
        </div>
      </Section>

      {/* Intentions */}
      <Section label="Intentions">
        <div className="flex flex-wrap gap-2">
          {intentionOptions.map(o => chip("intentions", o))}
        </div>
      </Section>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  STEP 3 — PROMPTS                            */
/* ──────────────────────────────────────────── */

function PromptsStep({ prompts, setPrompts }: {
  prompts: Prompt[];
  setPrompts: React.Dispatch<React.SetStateAction<Prompt[]>>;
}) {
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  const chooseQuestion = (idx: number, q: string) => {
    setPrompts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], question: q };
      return next;
    });
    setPickingFor(null);
  };

  const setAnswer = (idx: number, answer: string) => {
    setPrompts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], answer };
      return next;
    });
  };

  return (
    <div className="pt-10 pb-4">
      <h1 className="font-editorial text-5xl text-white mb-2">Your Prompts</h1>
      <p className="text-sm mb-10 text-white/40">
        Two questions. Show them who you really are.
      </p>

      {prompts.map((p, i) => (
        <motion.div
          key={i}
          layout
          className="liquid-glass mb-6 p-6 rounded-3xl"
        >
          {/* Prompt selector */}
          <button
            onClick={() => setPickingFor(pickingFor === i ? null : i)}
            className="w-full text-left mb-3 flex items-center justify-between group"
          >
            <span
              className={cn("text-sm font-semibold", p.question ? "" : "italic")}
              style={{ color: p.question ? "hsl(var(--dw-text))" : "hsl(var(--dw-text-soft))" }}
            >
              {p.question || "Choose a prompt..."}
            </span>
            <ChevronRight
              className={cn("w-4 h-4 shrink-0 transition-transform", pickingFor === i ? "rotate-90" : "")}
              style={{ color: "hsl(var(--dw-accent))" }}
            />
          </button>

          {/* Prompt picker dropdown */}
          <AnimatePresence>
            {pickingFor === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1 mb-4 max-h-48 overflow-y-auto pr-1">
                  {ALL_PROMPTS.map(q => {
                    const usedByOther = prompts.some((pp, ii) => ii !== i && pp.question === q);
                    return (
                      <button
                        key={q}
                        onClick={() => !usedByOther && chooseQuestion(i, q)}
                        disabled={usedByOther}
                        className={cn(
                          "text-left text-xs px-3 py-2.5 rounded-xl transition-all",
                          usedByOther && "opacity-30 cursor-not-allowed",
                          !usedByOther && "hover:bg-rose-50 active:bg-rose-100"
                        )}
                        style={{ color: "hsl(var(--dw-text))" }}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer textarea */}
          {p.question && (
            <div className="relative">
              <textarea
                value={p.answer}
                onChange={e => e.target.value.length <= 150 && setAnswer(i, e.target.value)}
                placeholder="Your answer..."
                rows={3}
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none font-sans"
                style={{
                  border: "1px solid hsl(var(--dw-border))",
                  color: "hsl(var(--dw-text))",
                  ["--tw-ring-color" as string]: "hsla(340,75%,55%,0.3)",
                }}
              />
              <span
                className="absolute bottom-3 right-3 text-[10px]"
                style={{ color: p.answer.length > 120 ? "hsl(var(--dw-accent))" : "hsl(var(--dw-text-soft))" }}
              >
                {p.answer.length}/150
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  STEP 4 — REVIEW                             */
/* ──────────────────────────────────────────── */

function ReviewStep({ media, vitals, prompts }: { media: any[]; vitals: Vitals; prompts: Prompt[] }) {
  const visVitals = Object.entries(vitals).filter(([_, v]) => v.visible && v.value);

  return (
    <div className="pt-10 pb-4">
      <h1 className="font-editorial text-5xl text-white mb-2">Preview</h1>
      <p className="text-sm mb-10 text-white/40">
        This is how others will see you.
      </p>

      {/* Hero photo */}
      {media[0] && (
        <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden mb-4" style={{ boxShadow: "var(--dw-shadow-lg)" }}>
          {media[0].type === "video"
            ? <video src={media[0].preview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            : <img src={media[0].preview} alt="" className="w-full h-full object-cover" />
          }
        </div>
      )}

      {/* Vitals chips */}
      {visVitals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {visVitals.map(([key, val]) => (
            <span key={key} className="dw-chip dw-chip-active text-xs">{val.value}</span>
          ))}
        </div>
      )}

      {/* Prompts */}
      {prompts.filter(p => p.question).map((p, i) => (
        <div key={i} className="liquid-glass p-6 mb-5 rounded-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3 ml-1">
            {p.question}
          </p>
          <p className="font-editorial text-2xl text-white leading-relaxed">"{p.answer}"</p>
        </div>
      ))}

      {/* Additional photos */}
      {media.length > 1 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {media.slice(1).map(item => (
            <div key={item.id} className="aspect-[3/4] rounded-2xl overflow-hidden">
              {item.type === "video"
                ? <video src={item.preview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                : <img src={item.preview} alt="" className="w-full h-full object-cover" />
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  HELPERS                                      */
/* ──────────────────────────────────────────── */

function Section({ label, sub, required, children }: { label: string; sub?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{label}</span>
        {required && <span className="text-amber-500 scale-150 rotate-12">*</span>}
        {sub && <span className="text-[10px] text-white/20 font-medium">({sub})</span>}
      </div>
      {children}
    </div>
  );
}

function VisToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all liquid-glass",
        visible ? "text-white" : "text-white/20 scale-95"
      )}
      title={visible ? "Visible on profile" : "Hidden from profile"}
    >
      {visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
    </button>
  );
}

function VideoPreview({ src }: { src: string }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        className="w-full h-full object-cover"
        onTimeUpdate={() => {
          if (videoRef.current && videoRef.current.currentTime >= 5.1) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          }
        }}
      />
      <button
        onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
        className="absolute bottom-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all"
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)" }}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
