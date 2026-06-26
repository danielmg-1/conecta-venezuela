import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { ESTADOS_VE } from "@/lib/venezuela";
import { Trash2, Pencil, X, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/voluntarios")({
  component: Page,
});

type Vol = {
  id: string;
  nombre: string;
  profesion: string;
  habilidades: string | null;
  estado: string;
  ciudad: string | null;
  contacto: string | null;
  disponibilidad: string | null;
  hidden_by_admin: boolean;
  created_at: string;
};

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [items, setItems] = useState<Vol[]>([]);
  const [editing, setEditing] = useState<Vol | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("volunteers").select("*").order("created_at", { ascending: false }).limit(500);
    setItems((data ?? []) as Vol[]);
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      nombre: String(fd.get("nombre") || "").trim(),
      profesion: String(fd.get("profesion") || "").trim(),
      habilidades: String(fd.get("habilidades") || "").trim() || null,
      estado: String(fd.get("estado") || editing.estado),
      ciudad: String(fd.get("ciudad") || "").trim() || null,
      contacto: String(fd.get("contacto") || "").trim() || null,
      disponibilidad: String(fd.get("disponibilidad") || "").trim() || null,
    };
    const { error: e1 } = await supabase.from("volunteers").update(payload).eq("id", editing.id);
    if (e1) { setError(e1.message); return; }
    setEditing(null);
    refresh();
  }

  async function toggleHide(v: Vol) {
    await supabase.from("volunteers").update({ hidden_by_admin: !v.hidden_by_admin }).eq("id", v.id);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este voluntario?")) return;
    await supabase.from("volunteers").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador.</p></Layout>;

  const filtered = q.trim() ? items.filter((i) => (i.nombre + " " + i.profesion + " " + i.estado).toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Voluntarios — Admin</h1>
      <p className="mt-1 text-muted-foreground">Edita, oculta o elimina perfiles.</p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="mt-6 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Editando: {editing.nombre}</h2>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /> Cancelar</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Nombre *</span><input name="nombre" required defaultValue={editing.nombre} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Profesión *</span><input name="profesion" required defaultValue={editing.profesion} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Estado</span>
              <select name="estado" defaultValue={editing.estado} className="rounded-xl border border-input bg-background px-3 py-2.5">
                {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Ciudad</span><input name="ciudad" defaultValue={editing.ciudad ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-medium">Habilidades</span><input name="habilidades" defaultValue={editing.habilidades ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Contacto</span><input name="contacto" defaultValue={editing.contacto ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Disponibilidad</span><input name="disponibilidad" defaultValue={editing.disponibilidad ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
          </div>
          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Guardar</button>
        </form>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th className="p-3">Profesión</th><th className="p-3">Estado</th><th className="p-3">Visible</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.nombre}</td>
                <td className="p-3 text-muted-foreground">{r.profesion}</td>
                <td className="p-3 text-muted-foreground">{r.estado}</td>
                <td className="p-3">{r.hidden_by_admin ? "Oculto" : "Visible"}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setEditing(r)} className="rounded-full border border-input px-2.5 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => toggleHide(r)} className="rounded-full border border-input px-3 py-1.5 text-xs">{r.hidden_by_admin ? "Mostrar" : "Ocultar"}</button>
                    <button onClick={() => remove(r.id)} className="rounded-full border border-destructive/30 px-2.5 py-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}