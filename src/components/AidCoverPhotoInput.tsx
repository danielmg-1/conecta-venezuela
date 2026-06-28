import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { optimizeImage } from "@/lib/image-optimize";
import { getSignedAidPhoto, uploadAidPhoto, deleteAidPhoto } from "@/lib/photo";

type Props = {
  userId: string;
  value: string | null;
  onChange: (path: string | null) => void;
};

export function AidCoverPhotoInput({ userId, value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) { setPreview(null); return; }
    getSignedAidPhoto(value).then((u) => { if (!cancelled) setPreview(u); });
    return () => { cancelled = true; };
  }, [value]);

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const { file: optimized } = await optimizeImage(file, { maxDim: 1600, quality: 0.82 });
      const path = await uploadAidPhoto(userId, optimized);
      // Best-effort delete of previous
      if (value) await deleteAidPhoto(value).catch(() => {});
      onChange(path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!value) { onChange(null); setPreview(null); return; }
    setBusy(true);
    await deleteAidPhoto(value).catch(() => {});
    onChange(null);
    setPreview(null);
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Foto del centro</span>
      <p className="text-xs text-muted-foreground">
        Una imagen ayuda a identificar el lugar. Se optimiza automáticamente (más liviana y rápida).
      </p>
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <img src={preview} alt="Foto del centro" className="aspect-video w-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute right-2 top-2 flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow disabled:opacity-50">Cambiar</button>
            <button type="button" onClick={handleRemove} disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-destructive shadow disabled:opacity-50">
              <Trash2 className="h-3 w-3" /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span>{busy ? "Subiendo y optimizando…" : "Subir foto del centro"}</span>
          <span className="text-xs">JPG, PNG o WEBP — máximo recomendado 1600px</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {err && <p className="rounded-xl bg-destructive/10 p-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}