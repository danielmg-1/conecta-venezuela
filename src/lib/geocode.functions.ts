import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((d: { lat: number; lng: number }) => {
    if (typeof d?.lat !== "number" || typeof d?.lng !== "number") {
      throw new Error("Invalid coordinates");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) return { address: null as string | null };
    const url = `${GATEWAY}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=es&region=ve`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmapsKey,
        },
      });
      if (!res.ok) return { address: null };
      const json = (await res.json()) as { results?: Array<{ formatted_address?: string }> };
      return { address: json.results?.[0]?.formatted_address ?? null };
    } catch {
      return { address: null };
    }
  });