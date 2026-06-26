import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { AID_TYPES } from "@/lib/aid";
import { ESTADOS_VE } from "@/lib/venezuela";
import { MapPicker } from "@/components/MapPicker";

export const Route = createFileRoute("/_authenticated/centros-acopio/$id/editar")({
  ssr: false,
  component: Page,
});

type Row = {
  id: string;
  owner_id: string;
  tipo: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  estado: string;
  ciudad: string | null;
  telefono: string | null;
  horario: string | null;
  necesidades: string | null;
  lat: number | null;
  lng: number | null;
};

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const router = useRouter();
  const [row, setRow] = useState<Row | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("aid_points").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      const r = data as Row | null;
      setRow(r);
      if (r?.lat != null && r?.lng != null) setCoords({ lat: r.lat, lng: r.lng });
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Layout><p className="text-sm text-muted-foreground">Cargando…</p></Layout>;
  if (!row) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm">No se encontró el centro.</p></Layout>;

  const canEdit = !!user && (user.id === row.owner_id || isAdmin);
  if (!canEdit) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm">Solo quien publicó este centro o el administrador pueden editarlo.</p></Layout>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!row) return;
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const { error: upErr } = await supabase.from("aid_points").update({
        tipo: String(fd.get("tipo")) as never,
        nombre: String(fd.get("nombre") || "").trim(),
        descripcion: String(fd.get("descripcion") || "").trim() || null,
        direccion: String(fd.get("direccion") || "").trim() || null,
        estado: String(fd.get("estado")),
        ciudad: String(fd.get("ciudad") || "").trim() || null,
        telefono: String(fd.get("telefono") || "").trim() || null,
        horario: String(fd.get("horario") || "").trim() || null,
        necesidades: String(fd.get("necesidades") || "").trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      }).eq("id", row.id);
      if (upErr) throw upErr;
      router.navigate({ to: "/centros-acopio" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Editar punto de ayuda</h1>
      <p className="mt-1 text-muted-foreground">Solo tú (quien lo publicó) o el administrador pueden modificarlo.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Tipo *</span>
          <select name="tipo" required defaultValue={row.tipo} className="rounded-xl border border-input bg-background px-3 py-2.5">
            {AID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm"><span className="font-medium">Nombre *</span><input name="nombre" required defaultValue={row.nombre} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
        <label className="grid gap-1.5 text-sm"><span className="font-medium">Descripción</span><textarea name="descripcion" rows={3} defaultValue={row.descripcion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estado *</span>
            <select name="estado" required defaultValue={row.estado} className="rounded-xl border border-input bg-background px-3 py-2.5">
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Ciudad</span><input name="ciudad" defaultValue={row.ciudad ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
        </div>

        <label className="grid gap-1.5 text-sm"><span className="font-medium">Dirección</span><input name="direccion" defaultValue={row.direccion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>

        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Ubicación en el mapa</span>
          <p className="text-xs text-muted-foreground">Toca el mapa para ajustar el punto exacto. Arrastra el marcador para moverlo.</p>
          <MapPicker value={coords} onChange={setCoords} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Teléfono</span><input name="telefono" defaultValue={row.telefono ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-medium">Horario</span><input name="horario" defaultValue={row.horario ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>
        </div>

        <label className="grid gap-1.5 text-sm"><span className="font-medium">Necesidades</span><textarea name="necesidades" rows={2} defaultValue={row.necesidades ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" /></label>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={saving} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </Layout>
  );
}