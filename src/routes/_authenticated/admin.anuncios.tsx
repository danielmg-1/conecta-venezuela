import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/anuncios")({
  component: Page,
});

type Ann = {
  id: string;
  title: string;
  body: string | null;
  variant: "info" | "warning" | "success" | "danger";
  pages: string[];
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const PAGE_OPTIONS = [
  { value: "*", label: "Todas las páginas" },
  { value: "/", label: "Inicio" },
  { value: "/desaparecidos", label: "Desaparecidos" },
  { value: "/mapa", label: "Mapa" },
  { value: "/centros-acopio", label: "Centros de ayuda" },
  { value: "/voluntarios", label: "Voluntarios" },
  { value: "/emergencias", label: "Emergencias" },
  { value: "/noticias", label: "Noticias" },
];

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [items, setItems] = useState<Ann[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>(["*"]);

  async function refresh() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Ann[]);
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  function togglePage(p: string) {
    setPages((prev) => {
      if (p === "*") return ["*"];
      const next = prev.filter((x) => x !== "*");
      return next.includes(p) ? next.filter((x) => x !== p) : [...next, p];
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null); setSubmitting(true);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      const { error: insErr } = await supabase.from("announcements").insert({
        created_by: user.id,
        title: String(fd.get("title") || "").trim(),
        body: String(fd.get("body") || "").trim() || null,
        variant: String(fd.get("variant") || "info"),
        pages: pages.length ? pages : ["*"],
        active: true,
        starts_at: (fd.get("starts_at") as string) || null,
        ends_at: (fd.get("ends_at") as string) || null,
      });
      if (insErr) throw insErr;
      form.reset();
      setPages(["*"]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSubmitting(false); }
  }

  async function toggleActive(a: Ann) {
    await supabase.from("announcements").update({ active: !a.active }).eq("id", a.id);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador puede gestionar anuncios.</p></Layout>;

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Anuncios globales</h1>
      <p className="mt-1 text-muted-foreground">Publica avisos que aparecerán arriba en las páginas que elijas.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Título *</span>
          <input name="title" required maxLength={120} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Mensaje</span>
          <textarea name="body" rows={3} maxLength={500} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estilo</span>
            <select name="variant" defaultValue="info" className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="info">Info (azul)</option>
              <option value="warning">Advertencia (ámbar)</option>
              <option value="success">Éxito (verde)</option>
              <option value="danger">Urgente (rojo)</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Inicio (opcional)</span>
            <input type="datetime-local" name="starts_at" className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Fin (opcional)</span>
            <input type="datetime-local" name="ends_at" className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
        </div>
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Mostrar en</span>
          <div className="flex flex-wrap gap-2">
            {PAGE_OPTIONS.map((p) => {
              const on = pages.includes(p.value);
              return (
                <button type="button" key={p.value} onClick={() => togglePage(p.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-muted"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Publicando…" : "Publicar anuncio"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Anuncios publicados</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aún no hay anuncios.</p>}
        {items.map((a) => (
          <article key={a.id} className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-VE")} · {a.variant}{!a.active && " · inactivo"}</p>
              <h3 className="font-semibold">{a.title}</h3>
              {a.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Páginas: {(a.pages?.length ? a.pages : ["*"]).join(", ")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => toggleActive(a)} className="rounded-full border border-input px-3 py-1.5 text-xs font-medium">
                {a.active ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => remove(a.id)} className="rounded-full border border-destructive/30 px-2.5 py-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}