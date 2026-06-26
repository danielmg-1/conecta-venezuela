import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ESTADOS_VE } from "@/lib/venezuela";

export const Route = createFileRoute("/_authenticated/voluntarios/registrarme")({
  component: Page,
});

type Existing = {
  id: string;
  nombre: string;
  profesion: string;
  habilidades: string | null;
  estado: string;
  ciudad: string | null;
  descripcion: string | null;
  contacto: string;
  disponibilidad: string | null;
};

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [existing, setExisting] = useState<Existing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("volunteers").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setExisting((data as Existing | null) ?? null);
    });
  }, [user]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        user_id: user.id,
        nombre: String(fd.get("nombre") || "").trim(),
        profesion: String(fd.get("profesion") || "").trim(),
        habilidades: String(fd.get("habilidades") || "").trim() || null,
        estado: String(fd.get("estado")),
        ciudad: String(fd.get("ciudad") || "").trim() || null,
        descripcion: String(fd.get("descripcion") || "").trim() || null,
        contacto: String(fd.get("contacto") || "").trim(),
        disponibilidad: String(fd.get("disponibilidad") || "").trim() || null,
      };
      const { error: upErr } = await supabase.from("volunteers").upsert(payload, { onConflict: "user_id" });
      if (upErr) throw upErr;
      router.navigate({ to: "/voluntarios" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{existing ? "Actualizar mi perfil" : "Registrarme como voluntario"}</h1>
      <p className="mt-1 text-muted-foreground">Tu perfil será visible públicamente para que hospitales y centros puedan contactarte.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <Field name="nombre" label="Nombre" required defaultValue={existing?.nombre} />
        <Field name="profesion" label="Profesión / oficio" required placeholder="Médico, psicólogo, ingeniero, conductor…" defaultValue={existing?.profesion} />
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Habilidades específicas</span>
          <textarea name="habilidades" rows={2} defaultValue={existing?.habilidades ?? ""} placeholder="Ej: traumatología, RCP, manejo de vehículo grande…" className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estado *</span>
            <select name="estado" required defaultValue={existing?.estado ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="">Selecciona…</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <Field name="ciudad" label="Ciudad" defaultValue={existing?.ciudad ?? ""} />
        </div>

        <Field name="contacto" label="Método de contacto" required placeholder="WhatsApp, correo o teléfono" defaultValue={existing?.contacto} />
        <Field name="disponibilidad" label="Disponibilidad" placeholder="Tardes, fines de semana, jornada completa…" defaultValue={existing?.disponibilidad ?? ""} />

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Sobre mí</span>
          <textarea name="descripcion" rows={3} defaultValue={existing?.descripcion ?? ""} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Guardando…" : existing ? "Actualizar perfil" : "Publicar perfil"}
        </button>
      </form>
    </Layout>
  );
}

function Field({ name, label, type = "text", required, placeholder, defaultValue }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}{required && " *"}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="rounded-xl border border-input bg-background px-3 py-2.5" />
    </label>
  );
}