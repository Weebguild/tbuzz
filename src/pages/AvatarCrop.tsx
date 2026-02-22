import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AvatarCrop() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshProfile } = useAuth();
  const file = (location.state as any)?.file as File | undefined;
  const returnTo = (location.state as any)?.returnTo as string | undefined;

  const [imageUrl, setImageUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) { navigate(returnTo || "/profile", { replace: true }); return; }
    setImageUrl(URL.createObjectURL(file));
  }, [file]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(3, s - e.deltaY * 0.001)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const handleConfirm = async () => {
    if (!user || !file || !imgRef.current) return;
    setSaving(true);
    try {
      const canvas = canvasRef.current!;
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const img = imgRef.current;
      const containerSize = 300;
      const scaleRatio = size / containerSize;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const fitScale = Math.max(containerSize / imgW, containerSize / imgH);
      const drawW = imgW * fitScale * scale * scaleRatio;
      const drawH = imgH * fitScale * scale * scaleRatio;
      const drawX = (size - drawW) / 2 + offset.x * scaleRatio;
      const drawY = (size - drawH) / 2 + offset.y * scaleRatio;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed to crop image");

      const path = `${user.id}/avatar.png`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` }).eq("user_id", user.id);
      await refreshProfile();
      toast.success("Avatar updated!");
      navigate(returnTo || "/profile", { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-4">
      <h2 className="text-lg font-bold text-foreground mb-4">Position your photo</h2>

      <div
        className="relative w-[300px] h-[300px] overflow-hidden rounded-full border-2 border-primary/50"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
        </div>
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop preview"
          className="absolute"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-3">Drag to reposition · Scroll to zoom</p>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate(returnTo || "/profile", { replace: true })}
          className="px-6 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 transition-transform active:scale-95"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
