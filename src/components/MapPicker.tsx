import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { google?: any }
}

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
  defaultCenter?: { lat: number; lng: number };
  height?: string;
};

export function MapPicker({ value, onChange, defaultCenter = { lat: 8.0, lng: -66.0 }, height = "h-72" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

  useEffect(() => {
    if (typeof window === "undefined" || !key) return;
    if (window.google?.maps) { setReady(true); return; }
    const existing = document.getElementById("gmaps-script") as HTMLScriptElement | null;
    const onLoad = () => setReady(true);
    if (existing) { existing.addEventListener("load", onLoad); return () => existing.removeEventListener("load", onLoad); }
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
    s.async = true; s.defer = true;
    s.addEventListener("load", onLoad);
    document.head.appendChild(s);
  }, [key]);

  useEffect(() => {
    if (!ready || !ref.current || mapRef.current) return;
    const initial = value ?? defaultCenter;
    const m = new window.google.maps.Map(ref.current, {
      center: initial,
      zoom: value ? 14 : 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = m;
    const place = (latLng: any) => {
      const pos = { lat: latLng.lat(), lng: latLng.lng() };
      if (markerRef.current) markerRef.current.setPosition(pos);
      else markerRef.current = new window.google.maps.Marker({ position: pos, map: m, draggable: true });
      markerRef.current.addListener?.("dragend", (ev: any) => onChange({ lat: ev.latLng.lat(), lng: ev.latLng.lng() }));
      onChange(pos);
    };
    if (value) {
      markerRef.current = new window.google.maps.Marker({ position: value, map: m, draggable: true });
      markerRef.current.addListener("dragend", (ev: any) => onChange({ lat: ev.latLng.lat(), lng: ev.latLng.lng() }));
    }
    m.addListener("click", (e: any) => place(e.latLng));
  }, [ready]);

  function useMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      mapRef.current.setCenter(p); mapRef.current.setZoom(15);
      if (markerRef.current) markerRef.current.setPosition(p);
      else {
        markerRef.current = new window.google.maps.Marker({ position: p, map: mapRef.current, draggable: true });
        markerRef.current.addListener("dragend", (ev: any) => onChange({ lat: ev.latLng.lat(), lng: ev.latLng.lng() }));
      }
      onChange(p);
    });
  }

  if (!key) return <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Mapa no disponible (falta clave de Google Maps).</p>;

  return (
    <div className="grid gap-2">
      <div ref={ref} className={`${height} w-full overflow-hidden rounded-xl border border-border`} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{value ? `📍 ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Toca el mapa para marcar la ubicación exacta"}</span>
        <div className="flex gap-2">
          <button type="button" onClick={useMyLocation} className="rounded-full border border-input px-3 py-1">Usar mi ubicación</button>
          {value && <button type="button" onClick={() => { markerRef.current?.setMap(null); markerRef.current = null; onChange(null); }} className="rounded-full border border-input px-3 py-1">Quitar</button>}
        </div>
      </div>
    </div>
  );
}