/**
 * Client-side image optimization: resize + re-encode (WebP preferred).
 * Reduces typical 3-5MB phone photos to ~150-300KB without visible loss.
 * Returns the original File untouched if the input isn't an image or the
 * browser can't decode it (defensive: never block the upload flow).
 */

export type OptimizeOpts = {
  maxDim?: number;
  quality?: number;
  preferWebp?: boolean;
};

export type OptimizedImage = {
  file: File;
  width: number;
  height: number;
};

function canEncodeWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

export async function optimizeImage(file: File, opts: OptimizeOpts = {}): Promise<OptimizedImage> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.82;
  const preferWebp = opts.preferWebp ?? true;

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return { file, width: 0, height: 0 };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (!w || !h) return { file, width: 0, height: 0 };
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, width: 0, height: 0 };
    ctx.drawImage(img, 0, 0, w, h);

    const targetMime = preferWebp && canEncodeWebp() ? "image/webp" : "image/jpeg";
    const ext = targetMime === "image/webp" ? "webp" : "jpg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, targetMime, quality));
    if (!blob) return { file, width: 0, height: 0 };

    // If the "optimized" output is larger than the original (already-tiny PNGs etc), keep the original.
    if (blob.size >= file.size && scale === 1) {
      return { file, width: w, height: h };
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const safeBase = base.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60) || "image";
    return {
      file: new File([blob], `${safeBase}.${ext}`, { type: targetMime, lastModified: Date.now() }),
      width: w,
      height: h,
    };
  } catch {
    return { file, width: 0, height: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}