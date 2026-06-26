import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { aidTypeLabel } from "@/lib/aid";

type Row = { id: string; full_name: string; status: MissingStatus; estado: string; hidden_by_admin: boolean; created_at: string };
type AidRow = { id: string; nombre: string; tipo: string; estado: string; hidden_by_admin: boolean; created_at: string };
type VolRow = { id: string; nombre: string; profesion: string; estado: string; hidden_by_admin: boolean; created_at: string };
type TipRow = { id: string; created_at: string };

const STATUS_COLORS: Record<string, string> = { desaparecido: "#ef4444", en_busqueda: "#f59e0b", encontrado: "#10b981" };

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [aid, setAid] = useState<AidRow[] | null>(null);
  const [vols, setVols] = useState<VolRow[] | null>(null);
  const [tips, setTips] = useState<TipRow[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: mp }, { data: ap }, { data: vp }, { data: tp }] = await Promise.all([
        supabase.from("missing_persons").select("id,full_name,status,estado,hidden_by_admin,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("aid_points").select("id,nombre,tipo,estado,hidden_by_admin,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("volunteers").select("id,nombre,profesion,estado,hidden_by_admin,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("tips").select("id,created_at").order("created_at", { ascending: false }).limit(1000),
      ]);
      setRows((mp ?? []) as Row[]);
      setAid((ap ?? []) as AidRow[]);
      setVols((vp ?? []) as VolRow[]);
      setTips((tp ?? []) as TipRow[]);
    })();
  }, [isAdmin]);

  async function toggleHide(id: string, hidden: boolean) {
    await supabase.from("missing_persons").update({ hidden_by_admin: !hidden }).eq("id", id);
    setRows((rs) => rs?.map((r) => r.id === id ? { ...r, hidden_by_admin: !hidden } : r) ?? null);
  }

  const counts = useMemo(() => {
    if (!rows) return null;
    return {
      total: rows.length,
      desaparecido: rows.filter((x) => x.status === "desaparecido" && !x.hidden_by_admin).length,
      en_busqueda: rows.filter((x) => x.status === "en_busqueda" && !x.hidden_by_admin).length,
      encontrado: rows.filter((x) => x.status === "encontrado" && !x.hidden_by_admin).length,
      ocultos: rows.filter((x) => x.hidden_by_admin).length,
    };
  }, [rows]);

  const statusData = useMemo(() => counts ? [
    { name: "Desaparecidos", value: counts.desaparecido, color: STATUS_COLORS.desaparecido },
    { name: "En búsqueda", value: counts.en_busqueda, color: STATUS_COLORS.en_busqueda },
    { name: "Encontrados", value: counts.encontrado, color: STATUS_COLORS.encontrado },
  ] : [], [counts]);

  const byEstadoData = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, number>();
    rows.filter((r) => !r.hidden_by_admin).forEach((r) => m.set(r.estado, (m.get(r.estado) ?? 0) + 1));
    return [...m.entries()].map(([estado, total]) => ({ estado, total })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [rows]);

  const aidByType = useMemo(() => {
    if (!aid) return [];
    const m = new Map<string, number>();
    aid.filter((r) => !r.hidden_by_admin).forEach((r) => m.set(r.tipo, (m.get(r.tipo) ?? 0) + 1));
    return [...m.entries()].map(([tipo, total]) => ({ tipo: aidTypeLabel(tipo), total }));
  }, [aid]);

  const trend = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, number>();
    const days = 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      m.set(d.toISOString().slice(0, 10), 0);
    }
    rows.forEach((r) => {
      const k = r.created_at.slice(0, 10);
      if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].map(([fecha, total]) => ({ fecha: fecha.slice(5), total }));
  }, [rows]);

  if (!isAdmin) {
    return <Layout><p className="py-20 text-center text-sm text-muted-foreground">Necesitas permisos de administrador.</p></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panel admin</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/admin/noticias" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Noticias</Link>
        <Link to="/admin/anuncios" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Anuncios globales</Link>
        <Link to="/admin/emergencias" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Emergencias</Link>
        <Link to="/admin/centros" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Centros</Link>
        <Link to="/admin/voluntarios" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Voluntarios</Link>
        <Link to="/admin/moderadores" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Moderadores</Link>
        <Link to="/centros-acopio/nuevo" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">+ Nuevo centro</Link>
        <button onClick={() => rows && download(`desaparecidos-${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows))} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Exportar desaparecidos CSV</button>
        <button onClick={() => aid && download(`centros-${new Date().toISOString().slice(0,10)}.csv`, toCSV(aid))} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Exportar centros CSV</button>
        <button onClick={() => vols && download(`voluntarios-${new Date().toISOString().slice(0,10)}.csv`, toCSV(vols))} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Exportar voluntarios CSV</button>
      </div>

      {counts && (
        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {[
            ["Reportes", counts.total],
            ["Desaparecidos", counts.desaparecido],
            ["En búsqueda", counts.en_busqueda],
            ["Encontrados", counts.encontrado],
            ["Ocultos", counts.ocultos],
            ["Centros", aid?.length ?? 0],
            ["Voluntarios", vols?.length ?? 0],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold">{v as number}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Reportes por estado (top 10)</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byEstadoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Estado de los reportes</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Nuevos reportes (últimos 14 días)</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Centros de ayuda por tipo</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aidByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tipo" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Pistas recibidas</div>
          <div className="mt-1 text-2xl font-bold">{tips?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Centros ocultos</div>
          <div className="mt-1 text-2xl font-bold">{aid?.filter((a) => a.hidden_by_admin).length ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">Voluntarios ocultos</div>
          <div className="mt-1 text-2xl font-bold">{vols?.filter((v) => v.hidden_by_admin).length ?? 0}</div>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Reportes recientes</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th className="p-3">Estado</th><th className="p-3">Status</th><th className="p-3">Visible</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><Link to="/desaparecidos/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.full_name}</Link></td>
                <td className="p-3 text-muted-foreground">{r.estado}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3">{r.hidden_by_admin ? "Oculto" : "Visible"}</td>
                <td className="p-3 text-right"><button onClick={() => toggleHide(r.id, r.hidden_by_admin)} className="rounded-full border border-input px-3 py-1 text-xs">{r.hidden_by_admin ? "Mostrar" : "Ocultar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}