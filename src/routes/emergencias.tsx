import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Phone } from "lucide-react";

type Row = { id: string; categoria: string; nombre_institucion: string; telefono: string; descripcion: string | null };

const FALLBACK: Row[] = [
  { id: "1", categoria: "Emergencia general", nombre_institucion: "Sistema 911", telefono: "911", descripcion: "Emergencias en todo el país" },
  { id: "2", categoria: "Bomberos", nombre_institucion: "Bomberos de Venezuela", telefono: "171", descripcion: "Rescate, incendios, atención" },
  { id: "3", categoria: "Protección Civil", nombre_institucion: "Protección Civil", telefono: "0212-662-1181", descripcion: "Coordinación de desastres" },
  { id: "4", categoria: "Cruz Roja", nombre_institucion: "Cruz Roja Venezolana", telefono: "0212-571-4380", descripcion: "Atención humanitaria" },
  { id: "5", categoria: "Apoyo psicológico", nombre_institucion: "Línea de ayuda psicológica UCAB", telefono: "0212-407-4434", descripcion: "Primeros auxilios psicológicos" },
];

export const Route = createFileRoute("/emergencias")({
  head: () => ({
    meta: [
      { title: "Emergencias — Guía de Apoyo Venezuela" },
      { name: "description", content: "Números oficiales de emergencia, bomberos, Protección Civil, Cruz Roja y apoyo psicológico en Venezuela." },
    ],
  }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("emergency_contacts").select("*").order("orden");
      setRows(data && data.length ? (data as Row[]) : FALLBACK);
    })();
  }, []);

  const grouped = (rows ?? []).reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.categoria] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Números de emergencia</h1>
      <p className="mt-1 text-muted-foreground">Toca un número para llamar directamente.</p>

      {rows === null ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((r) => (
                  <a key={r.id} href={`tel:${r.telefono.replace(/\s/g, "")}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Phone className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.nombre_institucion}</p>
                      {r.descripcion && <p className="truncate text-xs text-muted-foreground">{r.descripcion}</p>}
                    </div>
                    <span className="font-mono text-sm font-semibold text-primary">{r.telefono}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  );
}