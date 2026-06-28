import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCanModerate } from "@/hooks/use-moderator-permissions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, CheckCircle2, XCircle, BadgeCheck, ExternalLink } from "lucide-react";

type Report = {
  id: string;
  content_type: "missing_person" | "aid_point" | "news";
  content_id: string;
  reason: string;
  details: string | null;
  reporter_id: string | null;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  resolution_note: string | null;
};

const REASON_LABEL: Record<string, string> = {
  falsa: "Información falsa",
  duplicada: "Duplicada",
  ofensiva: "Ofensiva",
  desactualizada: "Desactualizada",
  spam: "Spam",
  otra: "Otra",
};

const TYPE_LABEL: Record<string, string> = {
  missing_person: "Persona",
  aid_point: "Centro de ayuda",
  news: "Noticia",
};

const TYPE_SECTION: Record<string, "desaparecidos" | "centros" | "noticias"> = {
  missing_person: "desaparecidos",
  aid_point: "centros",
  news: "noticias",
};

export const Route = createFileRoute("/_authenticated/admin/reportes-contenido")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { allowed, loading: permLoading } = useCanModerate(user?.id, "reportes");
  const [items, setItems] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [titlesByKey, setTitlesByKey] = useState<Record<string, string>>({});

  async function load() {
    let q = supabase.from("content_reports").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    const list = (data ?? []) as Report[];
    setItems(list);

    // Fetch titles for context
    const byType: Record<string, string[]> = { missing_person: [], aid_point: [], news: [] };
    list.forEach((r) => byType[r.content_type]?.push(r.content_id));
    const titles: Record<string, string> = {};
    if (byType.missing_person.length) {
      const { data: d } = await supabase.from("missing_persons").select("id,full_name").in("id", byType.missing_person);
      (d ?? []).forEach((x: { id: string; full_name: string }) => { titles[`missing_person:${x.id}`] = x.full_name; });
    }
    if (byType.aid_point.length) {
      const { data: d } = await supabase.from("aid_points").select("id,nombre").in("id", byType.aid_point);
      (d ?? []).forEach((x: { id: string; nombre: string }) => { titles[`aid_point:${x.id}`] = x.nombre; });
    }
    if (byType.news.length) {
      const { data: d } = await supabase.from("news").select("id,titulo").in("id", byType.news);
      (d ?? []).forEach((x: { id: string; titulo: string }) => { titles[`news:${x.id}`] = x.titulo; });
    }
    setTitlesByKey(titles);
  }

  useEffect(() => { if (allowed) void load(); /* eslint-disable-next-line */ }, [allowed, filter]);

  async function resolve(id: string, status: "reviewed" | "dismissed") {
    const { error } = await supabase.rpc("resolve_content_report", { _report_id: id, _status: status, _note: null });
    if (error) { toast.error(error.message); return; }
    toast.success(status === "reviewed" ? "Reporte marcado como revisado" : "Reporte descartado");
    await load();
  }

  async function verify(r: Report) {
    const { error } = await supabase.rpc("set_content_verified", { _type: r.content_type, _id: r.content_id, _verified: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Contenido marcado como verificado");
  }

  if (permLoading) return <Layout><p className="py-10 text-sm text-muted-foreground">Cargando…</p></Layout>;
  if (!allowed) return <Layout><p className="py-20 text-center text-sm text-muted-foreground">No tienes permisos para ver reportes de contenido.</p></Layout>;

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl"><Flag className="h-6 w-6" /> Reportes de contenido</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lo que la comunidad marcó como falso, duplicado u ofensivo.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter("pending")} className={`rounded-full border px-4 py-2 text-sm ${filter === "pending" ? "border-foreground bg-foreground/5" : "border-input"}`}>Pendientes</button>
          <button onClick={() => setFilter("all")} className={`rounded-full border px-4 py-2 text-sm ${filter === "all" ? "border-foreground bg-foreground/5" : "border-input"}`}>Todos</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No hay reportes {filter === "pending" ? "pendientes" : ""}.</p>
        ) : (
          items.map((r) => {
            const key = `${r.content_type}:${r.content_id}`;
            const title = titlesByKey[key] ?? "(contenido no disponible)";
            const link = r.content_type === "missing_person"
              ? `/desaparecidos/${r.content_id}`
              : r.content_type === "aid_point" ? `/centros-acopio`
              : `/noticias`;
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5">{TYPE_LABEL[r.content_type]}</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">{REASON_LABEL[r.reason] ?? r.reason}</span>
                      <span>{new Date(r.created_at).toLocaleString("es-VE")}</span>
                      {r.status !== "pending" && <span className="rounded-full bg-muted px-2 py-0.5">{r.status === "reviewed" ? "Revisado" : "Descartado"}</span>}
                    </div>
                    <h3 className="mt-1 truncate text-base font-semibold">{title}</h3>
                    {r.details && <p className="mt-1 text-sm text-foreground/80">{r.details}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={link} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver contenido
                    </Link>
                    <Button type="button" size="sm" variant="outline" onClick={() => verify(r)} className="gap-1">
                      <BadgeCheck className="h-4 w-4" /> Verificar
                    </Button>
                    {r.status === "pending" && (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => resolve(r.id, "reviewed")} className="gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Marcar revisado
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => resolve(r.id, "dismissed")} className="gap-1">
                          <XCircle className="h-4 w-4" /> Descartar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      {/* keep type import referenced */}
      <span className="hidden">{TYPE_SECTION.missing_person}</span>
    </Layout>
  );
}