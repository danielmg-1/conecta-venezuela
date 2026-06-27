import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Photo } from "@/components/Photo";
import { StatusBadge, type MissingStatus } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { ESTADOS_VE } from "@/lib/venezuela";
import { Search, SlidersHorizontal, Plus, MapPin, Calendar, IdCard, Phone, Mail, MessageCircle, Instagram, Share2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Row = {
  id: string;
  full_name: string;
  cedula: string | null;
  birth_date: string | null;
  estado: string;
  ciudad: string | null;
  lugar_desaparicion: string | null;
  status: MissingStatus;
  photo_path: string | null;
  created_at: string;
};

type PersonFull = Row & { descripcion: string | null; reporter_id: string };
type Contact = { id: string; tipo: string; valor: string; codigo_pais: string | null };

export const Route = createFileRoute("/desaparecidos/")({
  head: () => ({
    meta: [
      { title: "Personas desaparecidas — Guía de Apoyo Venezuela" },
      { name: "description", content: "Busca a personas reportadas como desaparecidas en Venezuela. Filtros por cédula, nombre, fecha de nacimiento y estado." },
      { property: "og:title", content: "Personas desaparecidas en Venezuela" },
      { property: "og:description", content: "Buscador con filtros para encontrar familiares y amigos reportados." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [cedula, setCedula] = useState("");
  const [estado, setEstado] = useState("");
  const [status, setStatus] = useState<"" | MissingStatus>("");
  const [bornFrom, setBornFrom] = useState("");
  const [bornTo, setBornTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openPerson, setOpenPerson] = useState<PersonFull | null>(null);
  const [openContacts, setOpenContacts] = useState<Contact[]>([]);
  const [loadingPerson, setLoadingPerson] = useState(false);

  useEffect(() => {
    if (!openId) { setOpenPerson(null); setOpenContacts([]); return; }
    let cancelled = false;
    setLoadingPerson(true);
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("missing_persons").select("*").eq("id", openId).maybeSingle(),
        supabase.from("missing_person_contacts").select("*").eq("person_id", openId),
      ]);
      if (cancelled) return;
      setOpenPerson((p ?? null) as PersonFull | null);
      setOpenContacts((c ?? []) as Contact[]);
      setLoadingPerson(false);
    })();
    return () => { cancelled = true; };
  }, [openId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("missing_persons")
        .select("id,full_name,cedula,birth_date,estado,ciudad,lugar_desaparicion,status,photo_path,created_at")
        .eq("hidden_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) setRows((data ?? []) as Row[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    const c = cedula.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (estado && r.estado !== estado) return false;
      if (q && !(`${r.full_name} ${r.ciudad ?? ""} ${r.lugar_desaparicion ?? ""}`.toLowerCase().includes(q))) return false;
      if (c && !(r.cedula ?? "").toLowerCase().includes(c)) return false;
      if (bornFrom && (!r.birth_date || r.birth_date < bornFrom)) return false;
      if (bornTo && (!r.birth_date || r.birth_date > bornTo)) return false;
      return true;
    });
  }, [rows, query, cedula, estado, status, bornFrom, bornTo]);

  const canManageOpenPerson = !!openPerson && !!user && (openPerson.reporter_id === user.id || isAdmin);

  async function deleteOpenPerson() {
    if (!openPerson) return;
    if (!confirm("¿Eliminar este reporte de forma permanente? Esta acción no se puede deshacer.")) return;
    if (openPerson.photo_path) {
      await supabase.storage.from("missing-photos").remove([openPerson.photo_path]).catch(() => {});
    }
    const { error } = await supabase.from("missing_persons").delete().eq("id", openPerson.id);
    if (error) {
      alert("No se pudo eliminar: " + error.message);
      return;
    }
    setRows((prev) => (prev ? prev.filter((r) => r.id !== openPerson.id) : prev));
    setOpenId(null);
  }

  async function changeOpenPersonStatus(s: MissingStatus) {
    if (!openPerson) return;
    const { error } = await supabase.from("missing_persons").update({ status: s }).eq("id", openPerson.id);
    if (error) { alert("No se pudo cambiar el estado: " + error.message); return; }
    setOpenPerson({ ...openPerson, status: s });
    setRows((prev) => (prev ? prev.map((r) => (r.id === openPerson.id ? { ...r, status: s } : r)) : prev));
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Personas reportadas</h1>
          <p className="mt-1 text-muted-foreground">Busca, filtra y ayuda a difundir.</p>
        </div>
        <Link to="/desaparecidos/nuevo" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Publicar reporte
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 md:p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, ciudad, lugar…"
              className="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="inline-flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula" className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Estado (todos)</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as "" | MissingStatus)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Estado (todos)</option>
              <option value="desaparecido">Desaparecido</option>
              <option value="en_busqueda">En búsqueda</option>
              <option value="encontrado">Encontrado</option>
            </select>
            <label className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <span className="block text-muted-foreground">Nacido desde</span>
              <input type="date" value={bornFrom} onChange={(e) => setBornFrom(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <span className="block text-muted-foreground">hasta</span>
              <input type="date" value={bornTo} onChange={(e) => setBornTo(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>
        )}
      </div>

      {rows === null ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">No hay resultados.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenId(r.id)}
              className="group overflow-hidden rounded-3xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Photo path={r.photo_path} alt={r.full_name} className="aspect-[4/5] w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold">{r.full_name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[r.ciudad, r.estado].filter(Boolean).join(", ")}
                </p>
                {r.cedula && <p className="mt-1 text-xs text-muted-foreground">CI: {r.cedula}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          {loadingPerson || !openPerson ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{openPerson.full_name}</DialogTitle>
                <DialogDescription>Ficha de la persona reportada.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                  <Photo path={openPerson.photo_path} alt={openPerson.full_name} className="aspect-square w-full object-cover" />
                </div>
                <div className="space-y-3 text-sm">
                  <StatusBadge status={openPerson.status} />
                  {openPerson.cedula && <DRow icon={<IdCard className="h-4 w-4" />} label="Cédula" value={openPerson.cedula} />}
                  {openPerson.birth_date && <DRow icon={<Calendar className="h-4 w-4" />} label="Fecha de nacimiento" value={formatDateOnly(openPerson.birth_date)} />}
                  <DRow icon={<MapPin className="h-4 w-4" />} label="Última ubicación" value={[openPerson.lugar_desaparicion, openPerson.ciudad, openPerson.estado].filter(Boolean).join(", ") || "—"} />
                </div>
              </div>
              {openPerson.descripcion && (
                <div className="rounded-2xl bg-muted p-4 text-sm">{openPerson.descripcion}</div>
              )}
              {openContacts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contactos de familiares</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {openContacts.map((c) => <DContactPill key={c.id} c={c} />)}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/desaparecidos/${openPerson.id}`;
                    if (navigator.share) navigator.share({ title: `Ayuda a localizar a ${openPerson.full_name}`, url }).catch(() => {});
                    else navigator.clipboard.writeText(url);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                >
                  <Share2 className="h-4 w-4" /> Compartir
                </button>
                {canManageOpenPerson && (
                  <Link
                    to="/desaparecidos/$id/editar"
                    params={{ id: openPerson.id }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Link>
                )}
                {canManageOpenPerson && (
                  <button
                    onClick={deleteOpenPerson}
                    className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                )}
              </div>
              {canManageOpenPerson && (
                <div className="rounded-2xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cambiar estado</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["desaparecido","en_busqueda","encontrado"] as MissingStatus[]).filter((s) => s !== openPerson.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => changeOpenPersonStatus(s)}
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                      >
                        Marcar como {s === "en_busqueda" ? "en búsqueda" : s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function DRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function DContactPill({ c }: { c: Contact }) {
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