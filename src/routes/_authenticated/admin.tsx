import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";

type Row = { id: string; full_name: string; status: MissingStatus; estado: string; hidden_by_admin: boolean; created_at: string };

export const Route = createFileRoute("/_authenticated/admin")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<{ total: number; desaparecido: number; en_busqueda: number; encontrado: number; ocultos: number } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from("missing_persons").select("id,full_name,status,estado,hidden_by_admin,created_at").order("created_at", { ascending: false }).limit(200);
      const r = (data ?? []) as Row[];
      setRows(r);
      setCounts({
        total: r.length,
        desaparecido: r.filter((x) => x.status === "desaparecido" && !x.hidden_by_admin).length,
        en_busqueda: r.filter((x) => x.status === "en_busqueda" && !x.hidden_by_admin).length,
        encontrado: r.filter((x) => x.status === "encontrado" && !x.hidden_by_admin).length,
        ocultos: r.filter((x) => x.hidden_by_admin).length,
      });
    })();
  }, [isAdmin]);

  async function toggleHide(id: string, hidden: boolean) {
    await supabase.from("missing_persons").update({ hidden_by_admin: !hidden }).eq("id", id);
    setRows((rs) => rs?.map((r) => r.id === id ? { ...r, hidden_by_admin: !hidden } : r) ?? null);
  }

  if (!isAdmin) {
    return <Layout><p className="py-20 text-center text-sm text-muted-foreground">Necesitas permisos de administrador.</p></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panel admin</h1>

      {counts && (
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {[
            ["Total", counts.total],
            ["Desaparecidos", counts.desaparecido],
            ["En búsqueda", counts.en_busqueda],
            ["Encontrados", counts.encontrado],
            ["Ocultos", counts.ocultos],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold">{v as number}</div>
            </div>
          ))}
        </div>
      )}

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