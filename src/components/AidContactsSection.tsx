import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Phone, MessageCircle, Mail, Instagram, Globe } from "lucide-react";

export type ContactKind = "telefono" | "whatsapp" | "email" | "instagram" | "otro";
export type AidContact = {
  id: string;
  aid_point_id: string;
  kind: ContactKind;
  value: string;
  label: string | null;
};

export const CONTACT_KINDS: Array<{ value: ContactKind; label: string }> = [
  { value: "telefono", label: "Teléfono" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
  { value: "instagram", label: "Instagram" },
  { value: "otro", label: "Otro" },
];

export function contactIcon(kind: ContactKind) {
  switch (kind) {
    case "telefono": return <Phone className="h-3.5 w-3.5" />;
    case "whatsapp": return <MessageCircle className="h-3.5 w-3.5" />;
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "instagram": return <Instagram className="h-3.5 w-3.5" />;
    default: return <Globe className="h-3.5 w-3.5" />;
  }
}

export function contactHref(c: { kind: ContactKind; value: string }): string | undefined {
  const v = c.value.trim();
  if (!v) return undefined;
  switch (c.kind) {
    case "telefono": return `tel:${v}`;
    case "whatsapp": return `https://wa.me/${v.replace(/[^0-9]/g, "")}`;
    case "email": return `mailto:${v}`;
    case "instagram": return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
    default: return v.startsWith("http") ? v : undefined;
  }
}

export type DraftContact = { kind: ContactKind; value: string; label: string | null };

/**
 * Editor in-memory para usar al CREAR un centro (aún no existe id).
 */
export function AidContactDraftEditor({ value, onChange }: { value: DraftContact[]; onChange: (v: DraftContact[]) => void }) {
  const [adding, setAdding] = useState(value.length === 0);
  const [kind, setKind] = useState<ContactKind>("telefono");
  const [val, setVal] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (!val.trim()) { setErr("Escribe el número o usuario."); return; }
    if (value.length >= 4) { setErr("Máximo 4 contactos."); return; }
    onChange([...value, { kind, value: val.trim(), label: label.trim() || null }]);
    setVal(""); setLabel(""); setKind("telefono"); setAdding(false);
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-input bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Métodos de contacto · hasta 4</p>
          <p className="text-xs text-muted-foreground">Teléfono, WhatsApp, correo, Instagram u otro. Puedes etiquetar cada uno (ej. "María, encargada").</p>
        </div>
        {!adding && value.length < 4 && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>

      {adding && (
        <div className="grid gap-2 rounded-xl border border-input bg-card p-3 md:grid-cols-[130px_1fr_1fr_auto]">
          <select value={kind} onChange={(e) => setKind(e.target.value as ContactKind)} className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm">
            {CONTACT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={kind === "instagram" ? "@usuario" : kind === "email" ? "correo@ejemplo.com" : "+58 412 0000000"} className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (opcional)" className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={add} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Agregar</button>
            {value.length > 0 && (
              <button type="button" onClick={() => { setAdding(false); setVal(""); setLabel(""); setErr(null); }} className="text-xs text-muted-foreground">Cancelar</button>
            )}
          </div>
        </div>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}

      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {value.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="rounded-full bg-muted p-1.5 text-foreground">{contactIcon(c.kind)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{CONTACT_KINDS.find((k) => k.value === c.kind)?.label}{c.label ? ` · ${c.label}` : ""}</p>
                </div>
              </div>
              <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AidContactsSection({ aidPointId, canManage }: { aidPointId: string; canManage: boolean }) {
  const [items, setItems] = useState<AidContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ContactKind>("telefono");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("aid_point_contacts" as never).select("id,aid_point_id,kind,value,label").eq("aid_point_id", aidPointId).order("created_at", { ascending: true });
    setItems(((data ?? []) as unknown) as AidContact[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [aidPointId]);

  async function add() {
    setErr(null);
    if (!value.trim()) return;
    if (items.length >= 4) { setErr("Máximo 4 contactos por centro."); return; }
    setBusy(true);
    const { error } = await supabase.from("aid_point_contacts" as never).insert({
      aid_point_id: aidPointId,
      kind,
      value: value.trim(),
      label: label.trim() || null,
    } as never);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setValue(""); setLabel(""); setKind("telefono"); setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este contacto?")) return;
    const { error } = await supabase.from("aid_point_contacts" as never).delete().eq("id", id);
    if (error) { alert(error.message); return; }
    load();
  }

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Métodos de contacto</h2>
          <p className="mt-1 text-sm text-muted-foreground">Hasta 4 contactos (teléfono, WhatsApp, correo, Instagram, otro).</p>
        </div>
        {canManage && !adding && items.length < 4 && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4 grid gap-2 rounded-2xl border border-input p-3 md:grid-cols-[140px_1fr_1fr_auto]">
          <select value={kind} onChange={(e) => setKind(e.target.value as ContactKind)} className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm">
            {CONTACT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "instagram" ? "@usuario" : kind === "email" ? "correo@ejemplo.com" : "Número o usuario"} className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (ej. María, encargada)" className="rounded-lg border border-input bg-background px-2.5 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={add} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Guardar</button>
            <button onClick={() => { setAdding(false); setValue(""); setLabel(""); }} className="text-xs text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      <ul className="mt-4 divide-y divide-border">
        {loading ? (
          <li className="py-3 text-sm text-muted-foreground">Cargando…</li>
        ) : items.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">Aún no hay contactos.</li>
        ) : items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-full bg-muted p-1.5 text-foreground">{contactIcon(c.kind)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.value}</p>
                <p className="text-xs text-muted-foreground">{CONTACT_KINDS.find((k) => k.value === c.kind)?.label}{c.label ? ` · ${c.label}` : ""}</p>
              </div>
            </div>
            {canManage && (
              <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}