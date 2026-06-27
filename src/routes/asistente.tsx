import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";

type Thread = { id: string; title: string; updated_at: string };

export const Route = createFileRoute("/asistente")({
  component: AsistenteLayout,
  head: () => ({
    meta: [
      { title: "Asistente IA — Guía de Apoyo Venezuela" },
      {
        name: "description",
        content:
          "Chat con asistente de IA para buscar personas desaparecidas, centros de ayuda, consejos en caso de sismo y números de emergencia en Venezuela.",
      },
    ],
  }),
});

function AsistenteLayout() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  useEffect(() => {
    if (!user) {
      setThreads([]);
      return;
    }
    supabase
      .from("chat_threads")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setThreads((data as Thread[]) ?? []));
  }, [user, activeId]);

  async function newThread() {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, visitor_id: user.id, title: "Nueva conversación" })
      .select("id")
      .single();
    if (error || !data) return;
    navigate({ to: "/asistente/$threadId", params: { threadId: data.id } });
  }

  async function removeThread(id: string) {
    await supabase.from("chat_threads").delete().eq("id", id);
    setThreads((t) => t.filter((x) => x.id !== id));
    if (activeId === id) navigate({ to: "/asistente" });
  }

  return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Asistente IA</h1>
          </div>
          {!user && (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Inicia sesión para guardar tus conversaciones. Sin sesión, el chat funciona solo en memoria.
            </p>
          )}
          <Button onClick={newThread} disabled={!user} className="w-full justify-start gap-2">
            <MessageSquarePlus className="h-4 w-4" /> Nueva conversación
          </Button>
          <div className="space-y-1">
            {threads.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Aún no tienes conversaciones.
              </p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm ${
                  activeId === t.id ? "bg-foreground/5" : "hover:bg-foreground/5"
                }`}
              >
                <Link
                  to="/asistente/$threadId"
                  params={{ threadId: t.id }}
                  className="line-clamp-1 flex-1"
                >
                  {t.title}
                </Link>
                <button
                  onClick={() => removeThread(t.id)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  aria-label="Borrar"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
        <section className="min-h-[70vh]">
          <Outlet />
        </section>
      </div>
    </Layout>
  );
}