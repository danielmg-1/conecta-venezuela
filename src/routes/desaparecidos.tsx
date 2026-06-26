import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Photo } from "@/components/Photo";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { ESTADOS_VE } from "@/lib/venezuela";
import { Search, SlidersHorizontal, Plus } from "lucide-react";

type Row = {
  id: string;
  full_name: string;
  cedula: string | null;
  birth_date: string | null;
  estado: string;
  ciudad: string | null;
  lugar_desaparicion: string | null;
  status: MissingStatus;
  photo_path: string | null;
  created_at: string;
};

export const Route = createFileRoute("/desaparecidos")({
  head: () => ({
    meta: [
      { title: "Personas desaparecidas — Guía de Apoyo Venezuela" },
      { name: "description", content: "Busca a personas reportadas como desaparecidas en Venezuela. Filtros por cédula, nombre, fecha de nacimiento y estado." },
      { property: "og:title", content: "Personas desaparecidas en Venezuela" },
      { property: "og:description", content: "Buscador con filtros para encontrar familiares y amigos reportados." },
    ],
  }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [cedula, setCedula] = useState("");
  const [estado, setEstado] = useState("");
  const [status, setStatus] = useState<"" | MissingStatus>("");
  const [bornFrom, setBornFrom] = useState("");
  const [bornTo, setBornTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("missing_persons")
        .select("id,full_name,cedula,birth_date,estado,ciudad,lugar_desaparicion,status,photo_path,created_at")
        .eq("hidden_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) setRows((data ?? []) as Row[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    const c = cedula.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (estado && r.estado !== estado) return false;
      if (q && !(`${r.full_name} ${r.ciudad ?? ""} ${r.lugar_desaparicion ?? ""}`.toLowerCase().includes(q))) return false;
      if (c && !(r.cedula ?? "").toLowerCase().includes(c)) return false;
      if (bornFrom && (!r.birth_date || r.birth_date < bornFrom)) return false;
      if (bornTo && (!r.birth_date || r.birth_date > bornTo)) return false;
      return true;
    });
  }, [rows, query, cedula, estado, status, bornFrom, bornTo]);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Personas reportadas</h1>
          <p className="mt-1 text-muted-foreground">Busca, filtra y ayuda a difundir.</p>
        </div>
        <Link to="/desaparecidos/nuevo" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Publicar reporte
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 md:p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, ciudad, lugar…"
              className="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Estado (todos)</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as "" | MissingStatus)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Estado (todos)</option>
              <option value="desaparecido">Desaparecido</option>
              <option value="en_busqueda">En búsqueda</option>
              <option value="encontrado">Encontrado</option>
            </select>
            <label className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <span className="block text-muted-foreground">Nacido desde</span>
              <input type="date" value={bornFrom} onChange={(e) => setBornFrom(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <span className="block text-muted-foreground">hasta</span>
              <input type="date" value={bornTo} onChange={(e) => setBornTo(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>
        )}
      </div>

      {rows === null ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">No hay resultados.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/desaparecidos/$id" params={{ id: r.id }} className="group overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md">
              <Photo path={r.photo_path} alt={r.full_name} className="aspect-[4/5] w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold">{r.full_name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[r.ciudad, r.estado].filter(Boolean).join(", ")}
                </p>
                {r.cedula && <p className="mt-1 text-xs text-muted-foreground">CI: {r.cedula}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}