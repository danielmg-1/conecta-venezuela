import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Photo } from "@/components/Photo";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";

type Row = { id: string; full_name: string; status: MissingStatus; photo_path: string | null; estado: string; ciudad: string | null };

export const Route = createFileRoute("/_authenticated/mis-reportes")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tips, setTips] = useState<Array<{ id: string; person_id: string; autor_nombre: string; mensaje: string; autor_contacto: string | null; created_at: string }> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("missing_persons").select("id,full_name,status,photo_path,estado,ciudad").eq("reporter_id", user.id).order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      const ids = (data ?? []).map((r) => r.id);
      if (ids.length) {
        const { data: t } = await supabase.from("tips").select("*").in("person_id", ids).order("created_at", { ascending: false });
        setTips((t ?? []) as never);
      } else setTips([]);
    })();
  }, [user]);

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mis reportes</h1>
      {!rows ? <p className="mt-10 text-muted-foreground">Cargando…</p> : rows.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aún no has publicado reportes. <Link to="/desaparecidos/nuevo" className="text-primary underline">Crear uno</Link>.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <Link key={r.id} to="/desaparecidos/$id" params={{ id: r.id }} className="flex gap-4 rounded-3xl border border-border bg-card p-3 hover:shadow-md">
              <Photo path={r.photo_path} alt={r.full_name} className="h-24 w-20 flex-none rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{r.full_name}</h3>
                <p className="truncate text-xs text-muted-foreground">{[r.ciudad, r.estado].filter(Boolean).join(", ")}</p>
                <div className="mt-2"><StatusBadge status={r.status} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-12 text-2xl font-bold tracking-tight">Pistas recibidas</h2>
      {!tips ? <p className="mt-4 text-muted-foreground">Cargando…</p> : tips.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Aún no hay pistas.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tips.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.autor_nombre}</span>
                <span>{new Date(t.created_at).toLocaleString("es-VE")}</span>
              </div>
              <p className="mt-2 text-sm">{t.mensaje}</p>
              {t.autor_contacto && <p className="mt-2 text-xs text-muted-foreground">Contacto: {t.autor_contacto}</p>}
              <Link to="/desaparecidos/$id" params={{ id: t.person_id }} className="mt-2 inline-block text-xs text-primary">Ver reporte →</Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}