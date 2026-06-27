import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { uploadMissingPhoto, getSignedPhoto } from "@/lib/photo";
import { ESTADOS_VE } from "@/lib/venezuela";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { Camera, Upload, X, Trash2, Plus } from "lucide-react";

type ContactDraft = {
  id?: string;
  tipo: "telefono" | "whatsapp" | "email" | "instagram" | "otro";
  valor: string;
  codigo_pais: string;
};

export const Route = createFileRoute("/_authenticated/desaparecidos/$id/editar")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    cedula: "",
    birth_date: "",
    estado: "",
    ciudad: "",
    lugar_desaparicion: "",
    descripcion: "",
  });

  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("missing_persons").select("*").eq("id", id).maybeSingle();
      if (!p) { setLoading(false); return; }
      const canEdit = !!user && (p.reporter_id === user.id || isAdmin);
      setAllowed(canEdit);
      setForm({
        full_name: p.full_name ?? "",
        cedula: p.cedula ?? "",
        birth_date: p.birth_date ?? "",
        estado: p.estado ?? "",
        ciudad: p.ciudad ?? "",
        lugar_desaparicion: p.lugar_desaparicion ?? "",
        descripcion: p.descripcion ?? "",
      });
      setExistingPhotoPath(p.photo_path);
      if (p.photo_path) setExistingPhotoUrl(await getSignedPhoto(p.photo_path));
      const { data: c } = await supabase.from("missing_person_contacts").select("*").eq("person_id", id);
      setContacts(
        ((c ?? []) as any[]).map((x) => ({
          id: x.id,
          tipo: x.tipo,
          valor: x.valor,
          codigo_pais: x.codigo_pais ?? "+58",
        })),
      );
      setLoading(false);
    })();
  }, [id, user, isAdmin]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) setRemovePhoto(false);
  }

  function addContact() {
    if (contacts.length >= 4) return;
    setContacts([...contacts, { tipo: "telefono", valor: "", codigo_pais: "+58" }]);
  }
  function removeContact(i: number) {
    const c = contacts[i];
    if (c.id) setDeletedContactIds([...deletedContactIds, c.id]);
    setContacts(contacts.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const valid = contacts.filter((c) => c.valor.trim().length > 0);
      if (valid.length < 1) throw new Error("Debes indicar al menos un contacto.");
      if (valid.length > 4) throw new Error("Máximo 4 contactos.");

      let photoPath: string | null | undefined = undefined;
      if (file) photoPath = await uploadMissingPhoto(user.id, file);
      else if (removePhoto) photoPath = null;

      const update: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        cedula: form.cedula.trim() || null,
        birth_date: form.birth_date || null,
        estado: form.estado,
        ciudad: form.ciudad.trim() || null,
        lugar_desaparicion: form.lugar_desaparicion.trim() || null,
        descripcion: form.descripcion.trim() || null,
      };
      if (photoPath !== undefined) update.photo_path = photoPath;

      const { error: uErr } = await supabase.from("missing_persons").update(update).eq("id", id);
      if (uErr) throw uErr;

      if (deletedContactIds.length > 0) {
        await supabase.from("missing_person_contacts").delete().in("id", deletedContactIds);
      }
      for (const c of valid) {
        const payload = {
          person_id: id,
          tipo: c.tipo,
          valor: c.valor.trim(),
          codigo_pais: c.codigo_pais.trim() || null,
        };
        if (c.id) {
          await supabase.from("missing_person_contacts").update(payload).eq("id", c.id);
        } else {
          await supabase.from("missing_person_contacts").insert(payload);
        }
      }

      router.navigate({ to: "/desaparecidos/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Layout><p className="py-20 text-center text-sm text-muted-foreground">Cargando…</p></Layout>;
  if (!allowed) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold">Sin permisos</h1>
        <p className="mt-2 text-muted-foreground">Solo quien publicó el reporte o un administrador pueden editarlo.</p>
        <Link to="/desaparecidos/$id" params={{ id }} className="mt-4 inline-block text-primary">← Volver al reporte</Link>
      </Layout>
    );
  }

  const showPhoto = preview ?? (!removePhoto ? existingPhotoUrl : null);

  return (
    <Layout>
      <Link to="/desaparecidos/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">← Volver al reporte</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Editar reporte</h1>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Foto de la persona</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {showPhoto ? (
            <div className="relative mt-1 w-fit">
              <img src={showPhoto} alt="Vista previa" className="h-40 w-40 rounded-2xl object-cover border border-border" />
              <button
                type="button"
                onClick={() => {
                  if (preview) { onPickFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
                  else { setRemovePhoto(true); }
                }}
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
              onClick={() => { setRemovePhoto(false); fileInputRef.current?.click(); }}
              className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input bg-muted/30 p-6 text-sm text-muted-foreground hover:bg-muted/50 hover:border-primary/50 transition"
            >
              <div className="flex gap-3"><Upload className="h-5 w-5" /><Camera className="h-5 w-5" /></div>
              <span className="font-medium text-foreground">Toca para subir una foto</span>
              <span className="text-xs">Desde galería o cámara · JPG, PNG</span>
            </button>
          )}
        </div>

        <Field label="Nombre completo *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cédula de identidad" value={form.cedula} onChange={(v) => setForm({ ...form, cedula: v })} placeholder="V-12345678" />
          <Field label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Estado</span>
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} required className="rounded-xl border border-input bg-background px-3 py-2.5">
              <option value="">Selecciona…</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <Field label="Ciudad" value={form.ciudad} onChange={(v) => setForm({ ...form, ciudad: v })} />
        </div>
        <Field label="Lugar donde se presume desapareció" value={form.lugar_desaparicion} onChange={(v) => setForm({ ...form, lugar_desaparicion: v })} />
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Descripción</span>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className="rounded-xl border border-input bg-background px-3 py-2.5" />
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
              <div key={c.id ?? `new-${i}`} className="grid grid-cols-[110px_90px_minmax(0,1fr)_auto] gap-2">
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

        <div className="flex gap-3">
          <button disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link to="/desaparecidos/$id" params={{ id }} className="inline-flex items-center justify-center rounded-full border border-input px-6 py-3 text-sm font-semibold">
            Cancelar
          </Link>
        </div>
      </form>
    </Layout>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} required={required} placeholder={placeholder} className="rounded-xl border border-input bg-background px-3 py-2.5" />
    </label>
  );
}
