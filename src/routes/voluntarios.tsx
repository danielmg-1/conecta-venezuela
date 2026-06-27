import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ESTADOS_VE } from "@/lib/venezuela";
import { MapPin, UserPlus, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/voluntarios")({
  head: () => ({
    meta: [
      { title: "Voluntarios profesionales — Guía de Apoyo Venezuela" },
      { name: "description", content: "Directorio de profesionales y voluntarios dispuestos a ayudar tras el terremoto en Venezuela." },
      { property: "og:title", content: "Voluntarios profesionales" },
      { property: "og:description", content: "Encuentra médicos, psicólogos, ingenieros y voluntarios listos para ayudar." },
    ],
  }),
  component: Page,
});

type Row = {
  id: string;
  nombre: string;
  profesion: string;
  habilidades: string | null;
  estado: string;
  ciudad: string | null;
  descripcion: string | null;
  contacto: string | null;
  disponibilidad: string | null;
};

function Page() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cols = user
      ? "id,nombre,profesion,habilidades,estado,ciudad,descripcion,contacto,disponibilidad"
      : "id,nombre,profesion,habilidades,estado,ciudad,descripcion,disponibilidad";
    let query = supabase
      .from("volunteers")
      .select(cols)
      .eq("hidden_by_admin", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (estado) query = query.eq("estado", estado);
    if (q.trim()) query = query.or(`profesion.ilike.%${q.trim()}%,habilidades.ilike.%${q.trim()}%,nombre.ilike.%${q.trim()}%`);
    query.then(({ data }) => {
      if (!cancelled) {
        setItems(((data ?? []) as unknown) as Row[]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [estado, q, user]);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Voluntarios</h1>
          <p className="mt-1 text-muted-foreground">Profesionales dispuestos a ayudar. Hospitales y centros pueden contactarlos directamente.</p>
        </div>
        <Link to="/voluntarios/registrarme" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <UserPlus className="h-4 w-4" /> Registrarme
        </Link>
      </div>

      <div className="mt-6 grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por profesión, habilidad o nombre…" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aún no hay voluntarios registrados con esos filtros.
          </p>
        ) : (
          items.map((it) => (
            <article key={it.id} className="rounded-3xl border border-border bg-card p-5">
              <h3 className="text-lg font-semibold">{it.nombre}</h3>
              <p className="text-sm font-medium text-primary">{it.profesion}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {it.ciudad ? `${it.ciudad}, ` : ""}{it.estado}
              </p>
              {it.habilidades && <p className="mt-2 text-sm"><strong>Habilidades:</strong> {it.habilidades}</p>}
              {it.descripcion && <p className="mt-2 text-sm text-muted-foreground">{it.descripcion}</p>}
              {it.disponibilidad && <p className="mt-2 text-xs text-muted-foreground">Disponibilidad: {it.disponibilidad}</p>}
              {it.contacto ? (
                <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"><strong>Contacto:</strong> {it.contacto}</p>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Inicia sesión para ver el contacto
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </Layout>
  );
}