import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/geocode.functions";

declare global {
  interface Window { google?: any }
}

type LatLng = { lat: number; lng: number };
type Props = {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
  onAddressChange?: (address: string) => void;
  defaultCenter?: LatLng;
  height?: string;
};

export function MapPicker({ value, onChange, onAddressChange, defaultCenter, height = "h-72" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; text: string }>>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const reverseGeocodeFn = useServerFn(reverseGeocode);
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

  // Load Google Maps JS API (async + places)
  useEffect(() => {
    if (typeof window === "undefined" || !key) return;
    if (window.google?.maps) { setReady(true); return; }
    const existing = document.getElementById("gmaps-script") as HTMLScriptElement | null;
    const onLoad = () => setReady(true);
    if (existing) { existing.addEventListener("load", onLoad); return () => existing.removeEventListener("load", onLoad); }
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&libraries=places&language=es&region=VE`;
    s.async = true; s.defer = true;
    s.addEventListener("load", onLoad);
    document.head.appendChild(s);
  }, [key]);

  // Init map once
  useEffect(() => {
    if (!ready || !ref.current || mapRef.current) return;
    const fallback = defaultCenter ?? { lat: 10.5, lng: -66.92 }; // Caracas
    const initial = value ?? fallback;
    const m = new window.google.maps.Map(ref.current, {
      center: initial,
      zoom: value ? 16 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
    });
    mapRef.current = m;

    if (value) placeMarker(value);

    m.addListener("click", (e: any) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      placeMarker(pos);
      onChange(pos);
      void doReverseGeocode(pos);
    });

    if (!value && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (markerRef.current) return; // user already picked
          m.setCenter({ lat: p.coords.latitude, lng: p.coords.longitude });
          m.setZoom(13);
        },
        () => {},
        { timeout: 3500, maximumAge: 60_000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function placeMarker(pos: LatLng) {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({ position: pos, map: mapRef.current, draggable: true });
      markerRef.current.addListener("dragend", (ev: any) => {
        const p = { lat: ev.latLng.lat(), lng: ev.latLng.lng() };
        onChange(p);
        void doReverseGeocode(p);
      });
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }
  }

  async function doReverseGeocode(pos: LatLng) {
    try {
      const res = await reverseGeocodeFn({ data: { lat: pos.lat, lng: pos.lng } });
      if (res?.address) {
        setFormattedAddress(res.address);
        onAddressChange?.(res.address);
      }
    } catch { /* ignore */ }
  }

  // Debounced autocomplete via Places API (New)
  useEffect(() => {
    if (!ready) return;
    const q = query.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const places: any = await window.google.maps.importLibrary("places");
        if (!sessionTokenRef.current) sessionTokenRef.current = new places.AutocompleteSessionToken();
        const { suggestions: sugg } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["ve"],
          language: "es",
        });
        if (cancelled) return;
        const items = (sugg ?? [])
          .slice(0, 6)
          .map((s: any) => ({
            placeId: s.placePrediction?.placeId,
            text: s.placePrediction?.text?.toString?.() ?? "",
          }))
          .filter((x: any) => x.placeId);
        setSuggestions(items);
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, ready]);

  async function pickSuggestion(placeId: string, text: string) {
    setShowSugg(false);
    setQuery(text);
    try {
      const places: any = await window.google.maps.importLibrary("places");
      const place = new places.Place({ id: placeId, requestedLanguage: "es" });
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      const loc = place.location;
      if (!loc) return;
      const pos = { lat: loc.lat(), lng: loc.lng() };
      mapRef.current?.setCenter(pos);
      mapRef.current?.setZoom(17);
      placeMarker(pos);
      onChange(pos);
      const addr = place.formattedAddress ?? text;
      setFormattedAddress(addr);
      onAddressChange?.(addr);
      sessionTokenRef.current = null;
    } catch { /* ignore */ }
  }

  function useMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        mapRef.current.setCenter(pos); mapRef.current.setZoom(17);
        placeMarker(pos);
        onChange(pos);
        void doReverseGeocode(pos);
        accuracyCircleRef.current = new window.google.maps.Circle({
          center: pos, radius: Math.max(15, p.coords.accuracy),
          strokeColor: "#3b82f6", strokeOpacity: 0.4, strokeWeight: 1,
          fillColor: "#3b82f6", fillOpacity: 0.12, map: mapRef.current,
        });
      },
      () => alert("No se pudo obtener tu ubicación. Revisa los permisos del navegador."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function tryPasteLink(text: string): boolean {
    const m =
      text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ??
      text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ??
      text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ??
      text.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (!m) return false;
    const pos = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return false;
    mapRef.current?.setCenter(pos); mapRef.current?.setZoom(17);
    placeMarker(pos);
    onChange(pos);
    void doReverseGeocode(pos);
    return true;
  }

  if (!key) return <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Mapa no disponible (falta clave de Google Maps).</p>;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSugg(true); }}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (tryPasteLink(t)) { e.preventDefault(); setQuery(""); setSuggestions([]); }
          }}
          placeholder="Busca una dirección o pega un enlace de Google Maps…"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        />
        {showSugg && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s.placeId, s.text)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={ref} className={`${height} w-full overflow-hidden rounded-xl border border-border`} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          {value
            ? (formattedAddress ? `📍 ${formattedAddress}` : `📍 ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`)
            : "Busca, toca el mapa o usa tu ubicación para fijar el punto exacto"}
        </span>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={useMyLocation} className="rounded-full border border-input px-3 py-1">Usar mi ubicación</button>
          {value && (
            <>
              <button
                type="button"
                onClick={() => { void navigator.clipboard?.writeText(`${value.lat},${value.lng}`); }}
                className="rounded-full border border-input px-3 py-1"
              >
                Copiar coord.
              </button>
              <button
                type="button"
                onClick={() => {
                  markerRef.current?.setMap(null); markerRef.current = null;
                  accuracyCircleRef.current?.setMap(null); accuracyCircleRef.current = null;
                  setFormattedAddress(null);
                  onChange(null);
                }}
                className="rounded-full border border-input px-3 py-1"
              >
                Quitar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}