import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Eye, EyeOff, Upload, X, Volume2, VolumeX, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Vitals {
  height: { value: string; visible: boolean };
  gender: { value: string; visible: boolean };
  major: { value: string; visible: boolean };
  gradYear: { value: string; visible: boolean };
  lifestyle: { value: string; visible: boolean };
  intentions: { value: string; visible: boolean };
}

export default function DatingOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("dating_profiles")
        .select("id, media")
        .eq("id", user.id)
        .maybeSingle();

      if (data && (data.media as string[])?.length === 5) {
        navigate("/dating/discover", { replace: true });
      } else {
        setChecking(false);
      }
    };
    check();
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="flex bg-[#faf8f5] items-center justify-center min-h-[100dvh]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--sg-accent))" }} />
      </div>
    );
  }

  return <OnboardingForm userId={user?.id} />;
}

function OnboardingForm({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate();
  const [media, setMedia] = useState<{ id: string; file: File; type: "image" | "video"; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vitals, setVitals] = useState<Vitals>({
    height: { value: "", visible: true },
    gender: { value: "", visible: true },
    major: { value: "", visible: true },
    gradYear: { value: "", visible: true },
    lifestyle: { value: "", visible: true },
    intentions: { value: "", visible: true },
  });

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (media.length + files.length > 5) {
      toast.error("You can only upload up to 5 pieces of media.");
      return;
    }

    const newMedia = files.map(file => {
      const isVideo = file.type.startsWith("video/");
      return {
        id: Math.random().toString(36).substring(7),
        file,
        type: isVideo ? "video" as const : "image" as const,
        preview: URL.createObjectURL(file)
      };
    });

    setMedia(prev => [...prev, ...newMedia]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (idToRemove: string) => {
    setMedia(prev => prev.filter((item) => item.id !== idToRemove));
  };

  const handleVitalChange = (key: keyof Vitals, field: "value" | "visible", newValue: any) => {
    setVitals(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: newValue }
    }));
  };

  const handleSubmit = async () => {
    if (media.length !== 5) {
      toast.error("The gallery requires exactly 5 pieces of media.");
      return;
    }

    setUploading(true);
    try {
      const mediaUrls = await Promise.all(
        media.map(async (item) => {
          const fileExt = item.file.name.split('.').pop() || (item.type === 'video' ? 'mp4' : 'jpg');
          const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("dating_media")
            .upload(fileName, item.file);

          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from("dating_media").getPublicUrl(fileName);
          return publicUrlData.publicUrl;
        })
      );

      const { error } = await supabase
        .from("dating_profiles")
        .upsert({
          id: userId,
          media: mediaUrls,
          vitals: vitals as any,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("Welcome to the Sunlit Gallery.");
      navigate("/dating/discover");
    } catch (err: any) {
      toast.error(err.message || "Failed to curate profile.");
    } finally {
      setUploading(false);
    }
  };

  const vitalsConfig = [
    { key: "height", placeholder: "Height (e.g. 5'10\")" },
    { key: "gender", placeholder: "Gender" },
    { key: "major", placeholder: "Major (e.g. Architecture)" },
    { key: "gradYear", placeholder: "Graduation Year" },
    { key: "lifestyle", placeholder: "Lifestyle (e.g. Socially)" },
    { key: "intentions", placeholder: "Intentions" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2c2c] px-6 py-12 selection:bg-[#7C3AED]/20">
      <div className="max-w-md mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-editorial text-5xl mb-3 tracking-tight">Curate Your Gallery</h1>
          <p className="text-[#6b6b6b] font-sans text-sm tracking-wide leading-relaxed">
            Welcome to a higher standard.<br/>
            Please provide exactly 5 pieces of media.
          </p>
        </div>

        {/* Media Uploader - Rule of 5 */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-editorial text-3xl">Visuals</h2>
            <span className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full",
              media.length === 5 ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-black/5 text-[#6b6b6b]"
            )}>
              {media.length} / 5
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {media.map((item, i) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  layout
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "relative overflow-hidden rounded-xl bg-white",
                    "shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
                    i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]"
                  )}
                >
                  {item.type === "video" ? (
                    <VideoPreview src={item.preview} />
                  ) : (
                    <img src={item.preview} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                  )}
                  
                  {/* Remove Button */}
                  <button 
                    onClick={() => removeMedia(item.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {media.length < 5 && (
              <motion.button
                layout
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "aspect-[3/4] rounded-xl border border-black/5 border-dashed flex flex-col items-center justify-center gap-3 text-[#6b6b6b] hover:bg-black/[0.02] transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white/50",
                  media.length === 0 ? "col-span-2 aspect-[4/5]" : ""
                )}
              >
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#2c2c2c]" />
                </div>
                <span className="text-xs font-medium tracking-wide uppercase">Add Media</span>
              </motion.button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,video/mp4,video/quicktime" 
            multiple 
            onChange={handleMediaUpload} 
          />
          <p className="text-xs text-[#a3a3a3] mt-4 text-center">
            Videos (max 5s) automatically loop on mute.
          </p>
        </div>

        {/* Vitals Form */}
        <div className="mb-16">
          <h2 className="font-editorial text-3xl mb-5">The Vitals</h2>
          <div className="space-y-3">
            {vitalsConfig.map(({ key, placeholder }) => {
              const data = vitals[key as keyof Vitals];
              return (
                <div key={key} className="flex items-center gap-3 group">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={data.value}
                      onChange={(e) => handleVitalChange(key as keyof Vitals, "value", e.target.value)}
                      className={cn(
                        "w-full bg-white border border-black/[0.04] rounded-xl px-4 py-3.5 text-sm font-sans placeholder:text-[#a3a3a3]",
                        "focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/30 transition-all",
                        "shadow-[0_2px_10px_rgb(0,0,0,0.02)]",
                        !data.visible && "text-[#8b8b8b] bg-white/60"
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVitalChange(key as keyof Vitals, "visible", !data.visible)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.02)]",
                      data.visible 
                        ? "bg-white border-black/[0.04] text-[#2c2c2c] hover:bg-[#faf8f5]" 
                        : "bg-[#f0ece6] border-transparent text-[#8b8b8b]"
                    )}
                    title={data.visible ? "Visible on profile" : "Hidden, but mapped for matching"}
                  >
                    {data.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={media.length !== 5 || uploading}
            className={cn(
              "w-full py-4 rounded-full font-medium tracking-wide transition-all duration-500 font-sans disabled:pointer-events-none relative overflow-hidden",
              media.length === 5 
                ? "bg-[#7C3AED] text-white shadow-[0_8px_30px_rgb(124,58,237,0.3)] hover:bg-[#6D28D9] hover:shadow-[0_8px_40px_rgb(124,58,237,0.4)] hover:-translate-y-0.5" 
                : "bg-black/5 text-[#a3a3a3] shadow-none"
            )}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span className="relative z-10 flex items-center justify-center gap-2">
                Complete Profile
              </span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

function VideoPreview({ src }: { src: string }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="w-full h-full relative group">
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
            videoRef.current.play().catch(()=>{});
          }
        }}
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMuted(!muted);
        }}
        className="absolute bottom-3 left-3 p-2 rounded-full bg-white/20 backdrop-blur-md text-white shadow-[0_4px_12px_rgb(0,0,0,0.1)] hover:bg-white/30 transition-all z-20"
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
