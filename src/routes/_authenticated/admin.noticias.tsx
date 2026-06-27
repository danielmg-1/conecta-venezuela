import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCanModerate } from "@/hooks/use-moderator-permissions";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  component: Page,
});

type News = { id: string; titulo: string; contenido: string; published: boolean; created_at: string };

function Page() {
  const { user } = useAuth();
  const { allowed: isAdmin } = useCanModerate(user?.id, "noticias");
  const [items, setItems] = useState<News[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as News[]);
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const { error: insErr } = await supabase.from("news").insert({
        author_id: user.id,
        titulo: String(fd.get("titulo") || "").trim(),
        contenido: String(fd.get("contenido") || "").trim(),
        published: true,
      });
      if (insErr) throw insErr;
      (e.currentTarget as HTMLFormElement).reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish(n: News) {
    await supabase.from("news").update({ published: !n.published }).eq("id", n.id);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta noticia?")) return;
    await supabase.from("news").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) {
    return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador puede gestionar noticias.</p></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Noticias — Admin</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Título *</span>
          <input name="titulo" required className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Contenido *</span>
          <textarea name="contenido" required rows={5} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Publicando…" : "Publicar noticia"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Publicadas</h2>
      <div className="mt-4 space-y-3">
        {items.map((n) => (
          <article key={n.id} className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-VE")}{!n.published && " · oculta"}</p>
              <h3 className="font-semibold">{n.titulo}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.contenido}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => togglePublish(n)} className="rounded-full border border-input px-3 py-1.5 text-xs font-medium">
                {n.published ? "Ocultar" : "Publicar"}
              </button>
              <button onClick={() => remove(n.id)} className="rounded-full border border-destructive/30 px-2.5 py-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}