import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, RotateCcw, Plus, Trash2 } from "lucide-react";

type Need = {
  id: string;
  title: string;
  details: string | null;
  priority: "alta" | "media" | "baja";
  fulfilled: boolean;
  fulfilled_at: string | null;
  created_at: string;
};

const PRIORITY_STYLES: Record<string, string> = {
  alta: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  media: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  baja: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
};

export function NeedsPanel({ aidPointId, canManage }: { aidPointId: string; canManage: boolean }) {
  const [items, setItems] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("aid_point_needs")
      .select("id,title,details,priority,fulfilled,fulfilled_at,created_at")
      .eq("aid_point_id", aidPointId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Need[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [aidPointId]);

  const active = items.filter((n) => !n.fulfilled);
  const history = items.filter((n) => n.fulfilled);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("aid_point_needs").insert({
      aid_point_id: aidPointId,
      title: title.trim(),
      details: details.trim() || null,
      priority,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setTitle(""); setDetails(""); setPriority("media"); setAdding(false);
    load();
  }

  async function setFulfilled(id: string, fulfilled: boolean) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("aid_point_needs").update({
      fulfilled,
      fulfilled_at: fulfilled ? new Date().toISOString() : null,
      fulfilled_by: fulfilled ? u.user?.id ?? null : null,
    }).eq("id", id);
    if (error) { alert(error.message); return; }
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta necesidad?")) return;
    const { error } = await supabase.from("aid_point_needs").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    load();
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Necesidades actuales</h4>
        {canManage && !adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> Agregar
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 grid gap-2 rounded-xl border border-input p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Agua potable" className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} placeholder="Detalles (opcional)" className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <select value={priority} onChange={(e) => setPriority(e.target.value as never)} className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm">
              <option value="alta">Prioridad alta</option>
              <option value="media">Prioridad media</option>
              <option value="baja">Prioridad baja</option>
            </select>
            <button disabled={busy} onClick={add} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Publicar</button>
            <button onClick={() => { setAdding(false); setTitle(""); setDetails(""); }} className="text-xs text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>
      ) : active.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Sin necesidades activas.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {active.map((n) => (
            <li key={n.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  {n.details && <p className="mt-1 text-xs text-muted-foreground">{n.details}</p>}
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setFulfilled(n.id, true)} title="Marcar como abastecido" className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Abastecido
                    </button>
                    <button onClick={() => remove(n.id)} title="Eliminar" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowHistory((v) => !v)} className="text-xs font-medium text-primary">
            {showHistory ? "Ocultar" : "Ver"} historial abastecido ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {history.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-dashed border-border p-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium line-through opacity-70">{n.title}</p>
                    {n.fulfilled_at && (
                      <p className="text-[11px] text-muted-foreground">Abastecido el {new Date(n.fulfilled_at).toLocaleDateString("es-VE")}</p>
                    )}
                  </div>
                  {canManage && (
                    <button onClick={() => setFulfilled(n.id, false)} title="Reabrir" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                      <RotateCcw className="h-3 w-3" /> Reabrir
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}