import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AID_TYPES } from "@/lib/aid";
import { ESTADOS_VE } from "@/lib/venezuela";
import { MapPicker } from "@/components/MapPicker";
import { AidContactDraftEditor, type DraftContact } from "@/components/AidContactsSection";

export const Route = createFileRoute("/_authenticated/centros-acopio/nuevo")({
  ssr: false,
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contacts, setContacts] = useState<DraftContact[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const { data: inserted, error: insErr } = await supabase.from("aid_points").insert({
        owner_id: user.id,
        tipo: String(fd.get("tipo")) as never,
        nombre: String(fd.get("nombre") || "").trim(),
        descripcion: String(fd.get("descripcion") || "").trim() || null,
        direccion: String(fd.get("direccion") || "").trim() || null,
        estado: String(fd.get("estado")),
        ciudad: String(fd.get("ciudad") || "").trim() || null,
        telefono: null,
        horario: String(fd.get("horario") || "").trim() || null,
        necesidades: String(fd.get("necesidades") || "").trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      }).select("id").single();
      if (insErr) throw insErr;
      if (inserted?.id && contacts.length > 0) {
        const rows = contacts.slice(0, 4).map((c) => ({
          aid_point_id: inserted.id,
          kind: c.kind,
          value: c.value,
          label: c.label,
        }));
        await supabase.from("aid_point_contacts" as never).insert(rows as never);
      }
      router.navigate({ to: "/centros-acopio" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Publicar punto de ayuda</h1>
      <p className="mt-1 text-muted-foreground">Centro de acopio, recaudación, hospital, primeros auxilios o apoyo psicológico.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Tipo *</span>
          <select name="tipo" required defaultValue="centro_acopio" className="rounded-xl border border-input bg-background px-3 py-2.5">
            {AID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <Field name="nombre" label="Nombre" required />
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Descripción</span>
          <textarea name="descripcion" rows={3} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estado *</span>
            <select name="estado" required className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="">Selecciona…</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <Field name="ciudad" label="Ciudad" />
        </div>

        <Field name="direccion" label="Dirección" placeholder="Av., edificio, sector…" />
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Ubicación en el mapa</span>
          <p className="text-xs text-muted-foreground">Toca el mapa para marcar el punto exacto. Puedes arrastrar el marcador para ajustarlo.</p>
          <MapPicker value={coords} onChange={setCoords} />
        </div>
        <Field name="horario" label="Horario" placeholder="L-V 8am-5pm" />

        <div className="grid gap-1.5 text-sm">
          <AidContactDraftEditor value={contacts} onChange={setContacts} />
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Necesidades (qué reciben)</span>
          <textarea name="necesidades" rows={2} placeholder="Agua, medicinas, ropa…" className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Publicando…" : "Publicar"}
        </button>
      </form>
    </Layout>
  );
}

function Field({ name, label, type = "text", required, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}{required && " *"}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="rounded-xl border border-input bg-background px-3 py-2.5" />
    </label>
  );
}