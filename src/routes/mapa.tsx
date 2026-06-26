import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; full_name: string; estado: string; ciudad: string | null; status: string; lat: number | null; lng: number | null };

const BASE_COORDS: Record<string, [number, number]> = {
  "Amazonas": [5.65, -67.62], "Anzoátegui": [10.13, -64.68], "Apure": [7.89, -67.48],
  "Aragua": [10.23, -67.59], "Barinas": [8.62, -70.21], "Bolívar": [8.13, -63.55],
  "Carabobo": [10.16, -68.0], "Cojedes": [9.65, -68.58], "Delta Amacuro": [9.04, -62.05],
  "Distrito Capital": [10.5, -66.92], "Falcón": [11.4, -69.66], "Guárico": [9.05, -67.36],
  "Lara": [10.06, -69.36], "Mérida": [8.59, -71.14], "Miranda": [10.32, -66.84],
  "Monagas": [9.74, -63.18], "Nueva Esparta": [10.99, -63.91], "Portuguesa": [9.05, -69.75],
  "Sucre": [10.45, -64.17], "Táchira": [7.77, -72.22], "Trujillo": [9.36, -70.43],
  "Vargas (La Guaira)": [10.6, -66.93], "Yaracuy": [10.34, -68.74], "Zulia": [10.0, -71.65],
};

export const Route = createFileRoute("/mapa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mapa en vivo — Guía de Apoyo Venezuela" },
      { name: "description", content: "Mapa interactivo con la concentración de personas reportadas tras el terremoto en Venezuela." },
    ],
  }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("missing_persons")
        .select("id,full_name,estado,ciudad,status,lat,lng")
        .eq("hidden_by_admin", false)
        .limit(1000);
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  // Load Google Maps JS
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
    if (!key) return;
    if (window.google?.maps) { initMap(); return; }
    const existing = document.getElementById("gmaps-script") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", initMap); return; }
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
    s.async = true; s.defer = true;
    s.addEventListener("load", initMap);
    document.head.appendChild(s);
    function initMap() {
      const el = document.getElementById("map-canvas");
      if (!el || !window.google?.maps) return;
      const m = new window.google.maps.Map(el, {
        center: { lat: 8.0, lng: -66.0 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      setMap(m);
    }
  }, []);

  const byEstado = useMemo(() => {
    const m = new Map<string, { total: number; desaparecido: number; en_busqueda: number; encontrado: number }>();
    (rows ?? []).forEach((r) => {
      const v = m.get(r.estado) ?? { total: 0, desaparecido: 0, en_busqueda: 0, encontrado: 0 };
      v.total++;
      // @ts-expect-error indexing
      v[r.status]++;
      m.set(r.estado, v);
    });
    return m;
  }, [rows]);

  // Place circles
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const circles: google.maps.Circle[] = [];
    const markers: google.maps.Marker[] = [];
    byEstado.forEach((v, estado) => {
      const c = BASE_COORDS[estado];
      if (!c) return;
      const circle = new window.google.maps.Circle({
        center: { lat: c[0], lng: c[1] },
        radius: 10000 + v.total * 4000,
        strokeColor: "#ef4444", strokeOpacity: 0.6, strokeWeight: 1,
        fillColor: "#ef4444", fillOpacity: 0.25, map,
      });
      circles.push(circle);
      const marker = new window.google.maps.Marker({
        position: { lat: c[0], lng: c[1] },
        map, label: { text: String(v.total), color: "#fff", fontSize: "12px", fontWeight: "700" },
        title: `${estado}: ${v.total} reportes`,
      });
      markers.push(marker);
    });
    return () => { circles.forEach((c) => c.setMap(null)); markers.forEach((m) => m.setMap(null)); };
  }, [map, byEstado]);

  const hasKey = !!(import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY);

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mapa en vivo</h1>
      <p className="mt-1 text-muted-foreground">Concentración de reportes por estado.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {hasKey ? (
          <div id="map-canvas" className="h-[60vh] w-full md:h-[70vh]" />
        ) : (
          <p className="p-10 text-center text-sm text-muted-foreground">No se encontró la clave de Google Maps. Mostrando solo el resumen.</p>
        )}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Resumen por estado</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...byEstado.entries()].sort((a, b) => b[1].total - a[1].total).map(([estado, v]) => (
          <div key={estado} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{estado}</h3>
              <span className="text-2xl font-bold">{v.total}</span>
            </div>
            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
              <span>Desap. {v.desaparecido}</span>
              <span>Búsqueda {v.en_busqueda}</span>
              <span>Encontrados {v.encontrado}</span>
            </div>
          </div>
        ))}
        {byEstado.size === 0 && rows !== null && <p className="text-sm text-muted-foreground">Aún no hay reportes.</p>}
      </div>
    </Layout>
  );
}