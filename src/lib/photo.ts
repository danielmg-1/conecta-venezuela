import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

export async function getSignedPhoto(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.exp > now) return cached.url;
  const { data, error } = await supabase.storage.from("missing-photos").createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, exp: now + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function uploadMissingPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("missing-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}