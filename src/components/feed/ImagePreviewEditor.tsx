import { useState, useRef, useCallback } from "react";
import { RotateCw, Crop, Check, X } from "lucide-react";

interface ImagePreviewEditorProps {
  file: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImagePreviewEditor({ file, onConfirm, onCancel }: ImagePreviewEditorProps) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rotate = () => setRotation((r) => (r + 90) % 360);

  const handleConfirm = useCallback(async () => {
    const img = new Image();
    img.src = previewUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = canvasRef.current;
    if (!canvas) { onConfirm(file); return; }

    const isRotated = rotation === 90 || rotation === 270;
    canvas.width = isRotated ? img.height : img.width;
    canvas.height = isRotated ? img.width : img.height;

    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob((blob) => {
      if (blob) {
        const newFile = new File([blob], file.name, { type: file.type });
        onConfirm(newFile);
      } else {
        onConfirm(file);
      }
    }, file.type);
  }, [rotation, previewUrl, file, onConfirm]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black/20 flex items-center justify-center" style={{ minHeight: 160 }}>
        <img
          src={previewUrl}
          alt="Preview"
          className="max-h-48 max-w-full object-contain"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={rotate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" /> Rotate
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold transition-transform active:scale-95"
          >
            <Check className="h-3.5 w-3.5" /> Confirm
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
