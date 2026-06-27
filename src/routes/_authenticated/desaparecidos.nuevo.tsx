import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { uploadMissingPhoto } from "@/lib/photo";
import { ESTADOS_VE } from "@/lib/venezuela";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Plus, Camera, Upload, X } from "lucide-react";
import { MapPicker } from "@/components/MapPicker";

type ContactDraft = { tipo: "telefono" | "whatsapp" | "email" | "instagram" | "otro"; valor: string; codigo_pais: string };

export const Route = createFileRoute("/_authenticated/desaparecidos/nuevo")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<ContactDraft[]>([{ tipo: "whatsapp", valor: "", codigo_pais: "+58" }]);
  const [consent, setConsent] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function addContact() {
    if (contacts.length >= 4) return;
    setContacts([...contacts, { tipo: "telefono", valor: "", codigo_pais: "+58" }]);
  }
  function removeContact(i: number) {
    setContacts(contacts.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const valid = contacts.filter((c) => c.valor.trim().length > 0);
      if (valid.length < 1) throw new Error("Debes indicar al menos un contacto.");
      if (valid.length > 4) throw new Error("Máximo 4 contactos.");
      if (!consent) throw new Error("Debes aceptar el consentimiento de publicación de datos.");

      let photoPath: string | null = null;
      if (file) photoPath = await uploadMissingPhoto(user.id, file);

      const { data: person, error: insErr } = await supabase
        .from("missing_persons")
        .insert({
          reporter_id: user.id,
          full_name: String(fd.get("full_name") || "").trim(),
          cedula: String(fd.get("cedula") || "").trim() || null,
          birth_date: String(fd.get("birth_date") || "") || null,
          estado: String(fd.get("estado") || ""),
          ciudad: String(fd.get("ciudad") || "").trim() || null,
          lugar_desaparicion: String(fd.get("lugar_desaparicion") || "").trim() || null,
          descripcion: String(fd.get("descripcion") || "").trim() || null,
          photo_path: photoPath,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          public_consent: true,
          consent_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !person) throw insErr ?? new Error("Error creando reporte");

      const { error: cErr } = await supabase.from("missing_person_contacts").insert(
        valid.map((c) => ({ person_id: person.id, tipo: c.tipo, valor: c.valor.trim(), codigo_pais: c.codigo_pais.trim() || null })),
      );
      if (cErr) throw cErr;

      router.navigate({ to: "/desaparecidos/$id", params: { id: person.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Nuevo reporte</h1>
      <p className="mt-1 text-muted-foreground">Sé claro y verídico. Otras personas confiarán en estos datos para ayudar.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Foto de la persona <span className="text-muted-foreground font-normal">(recomendado)</span>
          </label>
          <p className="text-xs text-muted-foreground -mt-1">
            Sube una foto clara del rostro. Ayuda muchísimo a que otras personas puedan reconocerla.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {preview ? (
            <div className="relative mt-1 w-fit">
              <img src={preview} alt="Vista previa" className="h-40 w-40 rounded-2xl object-cover border border-border" />
              <button
                type="button"
                onClick={() => { onPickFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                aria-label="Quitar foto"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 block text-xs font-medium text-primary hover:underline"
              >
                Cambiar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input bg-muted/30 p-6 text-sm text-muted-foreground hover:bg-muted/50 hover:border-primary/50 transition"
            >
              <div className="flex gap-3">
                <Upload className="h-5 w-5" />
                <Camera className="h-5 w-5" />
              </div>
              <span className="font-medium text-foreground">Toca para subir una foto</span>
              <span className="text-xs">Desde galería o cámara · JPG, PNG (máx. 10MB)</span>
            </button>
          )}
        </div>

        <Field name="full_name" label="Nombre completo" required />
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="cedula" label="Cédula de identidad" placeholder="V-12345678" />
          <Field name="birth_date" label="Fecha de nacimiento" type="date" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estado</span>
            <select name="estado" required className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="">Selecciona…</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <Field name="ciudad" label="Ciudad" />
        </div>

        <Field name="lugar_desaparicion" label="Lugar donde se presume desapareció" placeholder="Av. principal, edificio, sector…" />

        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Ubicación en el mapa <span className="text-muted-foreground font-normal">(opcional)</span></span>
          <p className="text-xs text-muted-foreground">Toca el mapa para marcar el lugar exacto. Ayuda a mostrarla en el mapa en vivo.</p>
          <MapPicker value={coords} onChange={setCoords} />
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Descripción (ropa, señas, contexto)</span>
          <textarea name="descripcion" rows={3} className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>

        <div className="rounded-2xl border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Contactos (1 a 4)</h3>
            <button type="button" onClick={addContact} disabled={contacts.length >= 4} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-xs font-medium disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" /> Añadir
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-[110px_90px_minmax(0,1fr)_auto] gap-2">
                <select value={c.tipo} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, tipo: e.target.value as ContactDraft["tipo"] } : x))} className="rounded-xl border border-input bg-background px-2 py-2 text-sm">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telefono">Teléfono</option>
                  <option value="email">Email</option>
                  <option value="instagram">Instagram</option>
                  <option value="otro">Otro</option>
                </select>
                <input
                  value={c.codigo_pais}
                  onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, codigo_pais: e.target.value } : x))}
                  placeholder="+58"
                  disabled={c.tipo === "email" || c.tipo === "instagram"}
                  className="rounded-xl border border-input bg-background px-2 py-2 text-sm disabled:opacity-40"
                />
                <input value={c.valor} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, valor: e.target.value } : x))} placeholder="Valor" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                <button type="button" onClick={() => removeContact(i)} disabled={contacts.length === 1} className="rounded-xl border border-input px-2 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4"
            required
          />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Consentimiento de publicación.</span>{" "}
            Confirmo que soy familiar, amigo cercano o tengo autorización para publicar estos
            datos, y acepto que la información del reporte (nombre, foto, cédula, lugar y
            contactos indicados) se muestre de forma <strong>pública</strong> en esta guía con
            el único fin de ayudar a localizar a la persona y permitir que otras personas se
            comuniquen con los contactos suministrados. Podré solicitar la eliminación del
            reporte en cualquier momento.
          </span>
        </label>
        <button disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? "Publicando…" : "Publicar reporte"}
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