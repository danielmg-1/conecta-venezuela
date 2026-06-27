import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Photo } from "@/components/Photo";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { MapPin, Calendar, IdCard, Phone, Mail, MessageCircle, Instagram, Share2, Pencil } from "lucide-react";

type Person = {
  id: string;
  reporter_id: string;
  full_name: string;
  cedula: string | null;
  birth_date: string | null;
  photo_path: string | null;
  estado: string;
  ciudad: string | null;
  lugar_desaparicion: string | null;
  descripcion: string | null;
  status: MissingStatus;
  created_at: string;
};
type Contact = { id: string; tipo: string; valor: string; codigo_pais: string | null };
type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
};

export const Route = createFileRoute("/desaparecidos/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [person, setPerson] = useState<Person | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [tipName, setTipName] = useState("");
  const [tipContact, setTipContact] = useState("");
  const [tipMsg, setTipMsg] = useState("");
  const [tipSent, setTipSent] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("missing_persons").select("*").eq("id", id).maybeSingle();
      setPerson(p as Person | null);
      const { data: c } = await supabase.from("missing_person_contacts").select("*").eq("person_id", id);
      setContacts((c ?? []) as Contact[]);
    })();
  }, [id]);

  const isOwner = !!user && person?.reporter_id === user.id;

  useEffect(() => {
    if (!person || !user || !(isOwner || isAdmin)) { setAudit([]); return; }
    supabase
      .from("missing_person_audit")
      .select("id, actor_email, action, changes, created_at")
      .eq("person_id", person.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAudit((data ?? []) as AuditRow[]));
  }, [person, user, isOwner, isAdmin]);

  async function updateStatus(s: MissingStatus) {
    if (!person) return;
    const { error } = await supabase.from("missing_persons").update({ status: s }).eq("id", person.id);
    if (!error) setPerson({ ...person, status: s });
  }

  async function submitTip(e: React.FormEvent) {
    e.preventDefault();
    setTipError(null);
    const { error } = await supabase.from("tips").insert({
      person_id: id,
      autor_nombre: tipName.trim(),
      autor_contacto: tipContact.trim() || null,
      mensaje: tipMsg.trim(),
    });
    if (error) setTipError("No se pudo enviar. Verifica nombre (mín. 2) y mensaje (mín. 4).");
    else {
      setTipSent(true);
      setTipName(""); setTipContact(""); setTipMsg("");
    }
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: `Ayuda a localizar a ${person?.full_name}`, url }).catch(() => {});
    else navigator.clipboard.writeText(url);
  }

  if (!person) {
    return <Layout><p className="py-20 text-center text-sm text-muted-foreground">Cargando…</p></Layout>;
  }

  return (
    <Layout>
      <Link to="/desaparecidos" className="text-sm text-muted-foreground hover:text-foreground">← Volver</Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_1.2fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <Photo path={person.photo_path} alt={person.full_name} className="aspect-square w-full object-cover" />
        </div>

        <div>
          <StatusBadge status={person.status} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{person.full_name}</h1>

          <dl className="mt-6 space-y-3 text-sm">
            {person.cedula && <Row icon={<IdCard className="h-4 w-4" />} label="Cédula" value={person.cedula} />}
            {person.birth_date && <Row icon={<Calendar className="h-4 w-4" />} label="Fecha de nacimiento" value={new Date(person.birth_date).toLocaleDateString("es-VE")} />}
            <Row icon={<MapPin className="h-4 w-4" />} label="Última ubicación" value={[person.lugar_desaparicion, person.ciudad, person.estado].filter(Boolean).join(", ")} />
          </dl>

          {person.descripcion && (
            <div className="mt-6 rounded-2xl bg-muted p-4 text-sm">
              {person.descripcion}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-muted-foreground">Contactos de familiares</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {contacts.map((c) => <ContactPill key={c.id} c={c} />)}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={share} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">
              <Share2 className="h-4 w-4" /> Compartir
            </button>
            {(isOwner || isAdmin) && (
              <Link
                to="/desaparecidos/$id/editar"
                params={{ id: person.id }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                <Pencil className="h-4 w-4" /> Editar
              </Link>
            )}
            {(isOwner || isAdmin) && (
              <div className="flex flex-wrap gap-2">
                {(["desaparecido","en_busqueda","encontrado"] as MissingStatus[]).filter(s => s !== person.status).map((s) => (
                  <button key={s} onClick={() => updateStatus(s)} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">
                    Marcar como {s === "en_busqueda" ? "en búsqueda" : s}
                  </button>
                ))}
              </div>
            )}
            {isAdmin && (
              <button
                onClick={async () => {
                  await supabase.from("missing_persons").update({ hidden_by_admin: true }).eq("id", person.id);
                  router.navigate({ to: "/desaparecidos" });
                }}
                className="rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
              >
                Ocultar (admin)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tip form */}
      <section className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-xl font-semibold">¿Tienes información?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Solo la persona que publicó este reporte y los administradores verán tu mensaje.</p>
        {tipSent ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Gracias. Tu pista fue enviada.</p>
        ) : (
          <form onSubmit={submitTip} className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={tipName} onChange={(e) => setTipName(e.target.value)} required placeholder="Tu nombre" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            <input value={tipContact} onChange={(e) => setTipContact(e.target.value)} placeholder="Tu contacto (opcional)" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            <textarea value={tipMsg} onChange={(e) => setTipMsg(e.target.value)} required rows={4} placeholder="¿Qué sabes? ¿Dónde la viste?" className="md:col-span-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            {tipError && <p className="md:col-span-2 text-sm text-destructive">{tipError}</p>}
            <button className="md:col-span-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Enviar pista</button>
          </form>
        )}
      </section>

      {(isOwner || isAdmin) && (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-xl font-semibold">Historial de cambios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Solo tú (quien publicó) y el administrador pueden ver esto.</p>
          {audit.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aún no hay registros.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {audit.map((a) => <AuditItem key={a.id} a={a} />)}
            </ol>
          )}
        </section>
      )}
    </Layout>
  );
}

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  photo_path: "Foto",
  full_name: "Nombre",
  cedula: "Cédula",
  birth_date: "Fecha de nacimiento",
  estado: "Estado (región)",
  ciudad: "Ciudad",
  lugar_desaparicion: "Lugar de desaparición",
  descripcion: "Descripción",
  hidden_by_admin: "Oculto por admin",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "photo_path") return "imagen";
  if (field === "status") {
    const m: Record<string, string> = { desaparecido: "Desaparecido", en_busqueda: "En búsqueda", encontrado: "Encontrado" };
    return m[String(value)] ?? String(value);
  }
  if (field === "hidden_by_admin") return value ? "Sí" : "No";
  return String(value);
}

function AuditItem({ a }: { a: AuditRow }) {
  const when = new Date(a.created_at).toLocaleString("es-VE");
  const who = a.actor_email ?? "Usuario";
  const isCreate = a.action === "create";
  const entries = Object.entries(a.changes ?? {});
  return (
    <li className="rounded-2xl border border-border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{isCreate ? "Reporte creado" : "Actualización"}</span>
        <span className="text-xs text-muted-foreground">{when}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">por {who}</p>
      {!isCreate && entries.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {entries.map(([field, val]) => {
            const diff = val as { old?: unknown; new?: unknown };
            return (
              <li key={field} className="text-sm">
                <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span>{" "}
                <span className="text-muted-foreground line-through">{formatValue(field, diff.old)}</span>
                {" → "}
                <span>{formatValue(field, diff.new)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}

function ContactPill({ c }: { c: Contact }) {
  const v = c.codigo_pais ? `${c.codigo_pais} ${c.valor}` : c.valor;
  let Icon = Phone;
  let href = `tel:${(c.codigo_pais ?? "") + c.valor}`;
  if (c.tipo === "email") { Icon = Mail; href = `mailto:${c.valor}`; }
  else if (c.tipo === "whatsapp") { Icon = MessageCircle; href = `https://wa.me/${(c.codigo_pais ?? "").replace(/\D/g,"")}${c.valor.replace(/\D/g,"")}`; }
  else if (c.tipo === "instagram") { Icon = Instagram; href = `https://instagram.com/${c.valor.replace(/^@/, "")}`; }
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted">
      <Icon className="h-4 w-4 text-primary" /> {v}
    </a>
  );
}