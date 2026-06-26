import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { AID_TYPES, aidTypeLabel } from "@/lib/aid";
import { ESTADOS_VE } from "@/lib/venezuela";
import { Trash2, Save, X, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/centros")({
  component: Page,
});

type Aid = {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  estado: string;
  ciudad: string | null;
  telefono: string | null;
  horario: string | null;
  necesidades: string | null;
  hidden_by_admin: boolean;
  created_at: string;
};

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [items, setItems] = useState<Aid[]>([]);
  const [editing, setEditing] = useState<Aid | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("aid_points").select("*").order("created_at", { ascending: false }).limit(500);
    setItems((data ?? []) as Aid[]);
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      tipo: String(fd.get("tipo") || editing.tipo),
      nombre: String(fd.get("nombre") || "").trim(),
      descripcion: String(fd.get("descripcion") || "").trim() || null,
      direccion: String(fd.get("direccion") || "").trim() || null,
      estado: String(fd.get("estado") || editing.estado),
      ciudad: String(fd.get("ciudad") || "").trim() || null,
      telefono: String(fd.get("telefono") || "").trim() || null,
      horario: String(fd.get("horario") || "").trim() || null,
      necesidades: String(fd.get("necesidades") || "").trim() || null,
    };
    const { error: e1 } = await supabase.from("aid_points").update(payload).eq("id", editing.id);
    if (e1) { setError(e1.message); return; }
    setEditing(null);
    refresh();
  }

  async function toggleHide(a: Aid) {
    await supabase.from("aid_points").update({ hidden_by_admin: !a.hidden_by_admin }).eq("id", a.id);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar definitivamente este centro?")) return;
    await supabase.from("aid_points").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador.</p></Layout>;

  const filtered = q.trim() ? items.filter((i) => (i.nombre + " " + i.estado + " " + (i.ciudad ?? "")).toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Centros de ayuda — Admin</h1>
      <p className="mt-1 text-muted-foreground">Edita, oculta o elimina cualquier centro publicado.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, ciudad o estado…" className="flex-1 min-w-[240px] rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
        <Link to="/centros-acopio/nuevo" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">+ Nuevo centro</Link>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Editando: {editing.nombre}</h2>
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /> Cancelar</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Nombre *</span><input name="nombre" required defaultValue={editing.nombre} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Tipo</span>
              <select name="tipo" defaultValue={editing.tipo} className="rounded-xl border border-input bg-background px-3 py-2.5">
                {AID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Estado</span>
              <select name="estado" defaultValue={editing.estado} className="rounded-xl border border-input bg-background px-3 py-2.5">
                {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Ciudad</span><input name="ciudad" defaultValue={editing.ciudad ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-medium">Dirección</span><input name="direccion" defaultValue={editing.direccion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Teléfono</span><input name="telefono" defaultValue={editing.telefono ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm"><span className="font-medium">Horario</span><input name="horario" defaultValue={editing.horario ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-medium">Descripción</span><textarea name="descripcion" rows={2} defaultValue={editing.descripcion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
            <label className="grid gap-1.5 text-sm md:col-span-2"><span className="font-medium">Necesidades</span><textarea name="necesidades" rows={2} defaultValue={editing.necesidades ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
          </div>
          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Guardar</button>
        </form>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Ubicación</th><th className="p-3">Visible</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.nombre}</td>
                <td className="p-3 text-muted-foreground">{aidTypeLabel(r.tipo)}</td>
                <td className="p-3 text-muted-foreground">{r.ciudad ? `${r.ciudad}, ` : ""}{r.estado}</td>
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