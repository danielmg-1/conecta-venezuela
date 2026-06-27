import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Photo } from "@/components/Photo";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";
import { Bell, Pencil, MailQuestion, Check, X } from "lucide-react";
import { aidTypeLabel } from "@/lib/aid";

type Row = { id: string; full_name: string; status: MissingStatus; photo_path: string | null; estado: string; ciudad: string | null; updated_at: string };

type Invitation = { aid_point_id: string; nombre: string; tipo: string; estado: string; ciudad: string | null; invited_at: string; status: string };

export const Route = createFileRoute("/_authenticated/mis-reportes")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tips, setTips] = useState<Array<{ id: string; person_id: string; autor_nombre: string; mensaje: string; autor_contacto: string | null; created_at: string }> | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("missing_persons").select("id,full_name,status,photo_path,estado,ciudad,updated_at").eq("reporter_id", user.id).order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      const ids = (data ?? []).map((r) => r.id);
      if (ids.length) {
        const { data: t } = await supabase.from("tips").select("*").in("person_id", ids).order("created_at", { ascending: false });
        setTips((t ?? []) as never);
      } else setTips([]);
      const { data: inv } = await supabase.rpc("aid_point_list_my_invitations" as never);
      setInvites(((inv ?? []) as unknown) as Invitation[]);
    })();
  }, [user]);

  async function respond(aidPointId: string, accept: boolean) {
    const { error } = await supabase.rpc("aid_point_respond_invitation" as never, { _aid_point_id: aidPointId, _accept: accept } as never);
    if (error) { alert(error.message); return; }
    setInvites((prev) => prev.map((i) => i.aid_point_id === aidPointId ? { ...i, status: accept ? "accepted" : "declined" } : i));
  }

  const stale = useMemo(() => {
    if (!rows) return [];
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return rows.filter((r) => r.status !== "encontrado" && new Date(r.updated_at).getTime() < cutoff);
  }, [rows]);

  async function markFound(id: string) {
    const { error } = await supabase.from("missing_persons").update({ status: "encontrado" }).eq("id", id);
    if (error) { alert("No se pudo actualizar: " + error.message); return; }
    setRows((prev) => prev ? prev.map((r) => r.id === id ? { ...r, status: "encontrado", updated_at: new Date().toISOString() } : r) : prev);
  }

  async function markStillSearching(id: string) {
    const { error } = await supabase.from("missing_persons").update({ status: "en_busqueda" }).eq("id", id);
    if (error) { alert("No se pudo actualizar: " + error.message); return; }
    setRows((prev) => prev ? prev.map((r) => r.id === id ? { ...r, status: "en_busqueda", updated_at: new Date().toISOString() } : r) : prev);
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mis reportes</h1>

      {invites.filter((i) => i.status === "pending").length > 0 && (
        <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/15 p-2 text-primary"><MailQuestion className="h-5 w-5" /></div>
            <div className="flex-1">
              <h2 className="font-semibold">Invitaciones para coadministrar centros</h2>
              <p className="mt-1 text-sm text-muted-foreground">Te invitaron a ser anfitrión de estos puntos de ayuda. Si aceptas, podrás editar la información y gestionar necesidades.</p>
              <ul className="mt-4 space-y-2">
                {invites.filter((i) => i.status === "pending").map((i) => (
                  <li key={i.aid_point_id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-background p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.nombre}</p>
                      <p className="text-xs text-muted-foreground">{aidTypeLabel(i.tipo)} · {[i.ciudad, i.estado].filter(Boolean).join(", ")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respond(i.aid_point_id, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        <Check className="h-3 w-3" /> Aceptar
                      </button>
                      <button onClick={() => respond(i.aid_point_id, false)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                        <X className="h-3 w-3" /> Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {invites.filter((i) => i.status === "accepted").length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Centros que coadministras</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {invites.filter((i) => i.status === "accepted").map((i) => (
              <li key={i.aid_point_id} className="rounded-xl border border-border p-3">
                <Link to="/centros-acopio/$id/editar" params={{ id: i.aid_point_id }} className="text-sm font-medium hover:underline">{i.nombre}</Link>
                <p className="text-xs text-muted-foreground">{aidTypeLabel(i.tipo)} · {[i.ciudad, i.estado].filter(Boolean).join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stale.length > 0 && (
        <div className="mt-6 rounded-3xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-200/70 p-2 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900 dark:text-amber-100">
                {stale.length === 1 ? "Tienes 1 reporte sin actualizar" : `Tienes ${stale.length} reportes sin actualizar`}
              </h2>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                Mantener el estado al día ayuda a que la información sea confiable. Confirma si la persona ya fue encontrada o sigue en búsqueda.
              </p>
              <ul className="mt-4 space-y-2">
                {stale.map((r) => {
                  const days = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/70 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">Sin cambios hace {days} día{days === 1 ? "" : "s"} · <StatusBadge status={r.status} /></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => markFound(r.id)} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Marcar encontrado</button>
                        {r.status !== "en_busqueda" && (
                          <button onClick={() => markStillSearching(r.id)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">Sigue en búsqueda</button>
                        )}
                        <Link to="/desaparecidos/$id/editar" params={{ id: r.id }} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                          <Pencil className="h-3 w-3" /> Editar
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

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