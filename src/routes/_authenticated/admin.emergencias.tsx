import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCanModerate } from "@/hooks/use-moderator-permissions";
import { Trash2, Pencil, X, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/emergencias")({
  component: Page,
});

type EC = {
  id: string;
  categoria: string;
  nombre_institucion: string;
  telefono: string;
  descripcion: string | null;
  orden: number | null;
};

function Page() {
  const { user } = useAuth();
  const { allowed: isAdmin } = useCanModerate(user?.id, "emergencias");
  const [items, setItems] = useState<EC[]>([]);
  const [editing, setEditing] = useState<EC | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.from("emergency_contacts").select("*").order("categoria").order("orden");
    setItems((data ?? []) as EC[]);
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      categoria: String(fd.get("categoria") || "").trim(),
      nombre_institucion: String(fd.get("nombre_institucion") || "").trim(),
      telefono: String(fd.get("telefono") || "").trim(),
      descripcion: String(fd.get("descripcion") || "").trim() || null,
      orden: Number(fd.get("orden") || 0),
    };
    try {
      if (editing) {
        const { error: e1 } = await supabase.from("emergency_contacts").update(payload).eq("id", editing.id);
        if (e1) throw e1;
        setEditing(null);
      } else {
        const { error: e2 } = await supabase.from("emergency_contacts").insert(payload);
        if (e2) throw e2;
      }
      form.reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este número?")) return;
    await supabase.from("emergency_contacts").delete().eq("id", id);
    refresh();
  }

  if (!isAdmin) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador puede gestionar emergencias.</p></Layout>;

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Números de emergencia</h1>
      <p className="mt-1 text-muted-foreground">Crea, edita o elimina los contactos que se muestran en la página pública.</p>

      <form key={editing?.id ?? "new"} onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{editing ? "Editando contacto" : "Nuevo contacto"}</h2>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Categoría *</span>
            <input name="categoria" required defaultValue={editing?.categoria ?? ""} placeholder="Ej. Bomberos, Apoyo psicológico" className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Institución *</span>
            <input name="nombre_institucion" required defaultValue={editing?.nombre_institucion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Teléfono *</span>
            <input name="telefono" required defaultValue={editing?.telefono ?? ""} placeholder="911 / 0212-..." className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Orden</span>
            <input name="orden" type="number" defaultValue={editing?.orden ?? 0} className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-medium">Descripción</span>
            <input name="descripcion" defaultValue={editing?.descripcion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" />
          </label>
        </div>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {editing ? "Guardar cambios" : "Agregar"}
        </button>
      </form>

      <h2 className="mt-10 text-xl font-semibold">Contactos publicados</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Categoría</th><th className="p-3">Institución</th><th className="p-3">Teléfono</th><th className="p-3">Orden</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{r.categoria}</td>
                <td className="p-3 font-medium">{r.nombre_institucion}{r.descripcion && <span className="block text-xs text-muted-foreground">{r.descripcion}</span>}</td>
                <td className="p-3 font-mono">{r.telefono}</td>
                <td className="p-3 text-muted-foreground">{r.orden ?? 0}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setEditing(r)} className="rounded-full border border-input px-2.5 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(r.id)} className="rounded-full border border-destructive/30 px-2.5 py-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Aún no hay contactos cargados.</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}