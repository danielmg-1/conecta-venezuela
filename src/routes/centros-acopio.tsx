import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { AID_TYPES, aidTypeLabel } from "@/lib/aid";
import { ESTADOS_VE } from "@/lib/venezuela";
import { MapPin, Phone, Plus, Pencil, ListChecks, AlertCircle } from "lucide-react";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { NeedsPanel } from "@/components/NeedsPanel";
import { contactHref, contactIcon, type ContactKind } from "@/components/AidContactsSection";
import { getSignedAidPhoto } from "@/lib/photo";

export const Route = createFileRoute("/centros-acopio")({
  head: () => ({
    meta: [
      { title: "Donaciones — Guía de Apoyo Venezuela" },
      { name: "description", content: "Encuentra centros de acopio, puntos de recaudación, hospitales y servicios de ayuda activos tras el terremoto en Venezuela." },
      { property: "og:title", content: "Donaciones" },
      { property: "og:description", content: "Mapa colaborativo de puntos de ayuda en Venezuela." },
    ],
  }),
  component: Page,
});

function AidThumb({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSignedAidPhoto(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" decoding="async" className="mb-3 aspect-video w-full rounded-2xl object-cover" />;
}

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
  cover_photo: string | null;
};

type ActiveNeed = {
  aid_point_id: string;
  title: string;
  priority: "alta" | "media" | "baja";
};

type ContactRow = {
  aid_point_id: string;
  kind: ContactKind;
  value: string;
  label: string | null;
};

const PRIORITY_DOT: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-amber-500",
  baja: "bg-emerald-500",
};

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [q, setQ] = useState("");
  const [hostIds, setHostIds] = useState<Set<string>>(new Set());
  const [openNeeds, setOpenNeeds] = useState<Record<string, boolean>>({});
  const [needs, setNeeds] = useState<ActiveNeed[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [onlyPending, setOnlyPending] = useState(false);
  const [needPriority, setNeedPriority] = useState<string>("");
  const [needQ, setNeedQ] = useState("");

  useEffect(() => {
    if (!user) { setHostIds(new Set()); return; }
    supabase.from("aid_point_hosts").select("aid_point_id").eq("user_id", user.id).then(({ data }) => {
      setHostIds(new Set((data ?? []).map((r) => r.aid_point_id as string)));
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cols = "id,owner_id,tipo,nombre,descripcion,direccion,estado,ciudad,telefono,horario,necesidades,cover_photo";
    let query = supabase
      .from("aid_points")
      .select(cols)
      .eq("hidden_by_admin", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (tipo) query = query.eq("tipo", tipo as never);
    if (estado) query = query.eq("estado", estado);
    if (q.trim()) query = query.ilike("nombre", `%${q.trim()}%`);
    query.then(({ data }) => {
      if (!cancelled) {
        setItems(((data ?? []) as unknown) as Row[]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tipo, estado, q]);

  useEffect(() => {
    if (items.length === 0) { setNeeds([]); return; }
    const ids = items.map((i) => i.id);
    let cancelled = false;
    supabase
      .from("aid_point_needs")
      .select("aid_point_id,title,priority")
      .in("aid_point_id", ids)
      .eq("fulfilled", false)
      .then(({ data }) => {
        if (!cancelled) setNeeds(((data ?? []) as unknown) as ActiveNeed[]);
      });
    return () => { cancelled = true; };
  }, [items]);

  useEffect(() => {
    if (items.length === 0) { setContacts([]); return; }
    const ids = items.map((i) => i.id);
    let cancelled = false;
    supabase
      .from("aid_point_contacts" as never)
      .select("aid_point_id,kind,value,label")
      .in("aid_point_id", ids)
      .then(({ data }) => {
        if (!cancelled) setContacts(((data ?? []) as unknown) as ContactRow[]);
      });
    return () => { cancelled = true; };
  }, [items]);

  const needsByPoint = needs.reduce<Record<string, ActiveNeed[]>>((acc, n) => {
    (acc[n.aid_point_id] ||= []).push(n);
    return acc;
  }, {});
  const contactsByPoint = contacts.reduce<Record<string, ContactRow[]>>((acc, c) => {
    (acc[c.aid_point_id] ||= []).push(c);
    return acc;
  }, {});

  const needQLower = needQ.trim().toLowerCase();
  const filteredItems = items.filter((it) => {
    const list = needsByPoint[it.id] ?? [];
    if (onlyPending && list.length === 0) return false;
    if (needPriority && !list.some((n) => n.priority === needPriority)) return false;
    if (needQLower && !list.some((n) => n.title.toLowerCase().includes(needQLower))) return false;
    return true;
  });

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Donaciones</h1>
          <p className="mt-1 text-muted-foreground">Acopio, recaudación, hospitales, primeros auxilios y apoyo psicológico.</p>
        </div>
        <Link to="/centros-acopio/nuevo" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Publicar punto
        </Link>
      </div>

      <div className="mt-6 grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="">Todos los tipos</option>
          {AID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="mt-3 grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3">
        <input
          value={needQ}
          onChange={(e) => setNeedQ(e.target.value)}
          placeholder="Buscar por necesidad (ej. agua, pañales)…"
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        />
        <select value={needPriority} onChange={(e) => setNeedPriority(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="">Cualquier prioridad</option>
          <option value="alta">Prioridad alta</option>
          <option value="media">Prioridad media</option>
          <option value="baja">Prioridad baja</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="h-4 w-4" />
          Solo con necesidades pendientes
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : filteredItems.length === 0 ? (
          <p className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aún no hay puntos publicados con esos filtros.
          </p>
        ) : (
          filteredItems.map((it) => {
            const list = needsByPoint[it.id] ?? [];
            const counts = { alta: 0, media: 0, baja: 0 } as Record<string, number>;
            list.forEach((n) => { counts[n.priority]++; });
            return (
            <article key={it.id} className="rounded-3xl border border-border bg-card p-5">
              {it.cover_photo && <AidThumb path={it.cover_photo} alt={it.nombre} />}
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{aidTypeLabel(it.tipo)}</span>
              <h3 className="mt-2 text-lg font-semibold">{it.nombre}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {it.ciudad ? `${it.ciudad}, ` : ""}{it.estado}
              </p>
              {it.direccion && <p className="mt-1 text-sm">{it.direccion}</p>}
              {it.descripcion && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{it.descripcion}</p>}
              {list.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5 text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="font-medium">{list.length} necesidad{list.length === 1 ? "" : "es"} pendiente{list.length === 1 ? "" : "s"}:</span>
                  {(["alta","media","baja"] as const).map((p) => counts[p] > 0 && (
                    <span key={p} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} /> {counts[p]} {p}
                    </span>
                  ))}
                </div>
              )}
              {it.necesidades && (
                <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <strong>Necesita:</strong> {it.necesidades}
                </p>
              )}
              {it.horario && <p className="mt-2 text-xs text-muted-foreground">Horario: {it.horario}</p>}
              {(() => {
                const cs = contactsByPoint[it.id] ?? [];
                if (cs.length === 0) {
                  return it.telefono ? (
                    <a href={`tel:${it.telefono}`} className="mt-3 inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium">
                      <Phone className="h-3.5 w-3.5" /> {it.telefono}
                    </a>
                  ) : null;
                }
                return (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cs.map((c, i) => {
                      const href = contactHref(c);
                      const inner = (
                        <>
                          {contactIcon(c.kind)}
                          <span className="truncate">{c.value}{c.label ? ` · ${c.label}` : ""}</span>
                        </>
                      );
                      return href ? (
                        <a key={i} href={href} target={c.kind === "instagram" || c.kind === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-medium">{inner}</a>
                      ) : (
                        <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs">{inner}</span>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setOpenNeeds((s) => ({ ...s, [it.id]: !s[it.id] }))} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium">
                  <ListChecks className="h-3.5 w-3.5" /> {openNeeds[it.id] ? "Ocultar" : "Ver"} necesidades
                </button>
                {(user?.id === it.owner_id || isAdmin || hostIds.has(it.id)) && (
                  <Link to="/centros-acopio/$id/editar" params={{ id: it.id }} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                )}
              </div>
              {openNeeds[it.id] && (
                <NeedsPanel aidPointId={it.id} canManage={!!user && (user.id === it.owner_id || isAdmin || hostIds.has(it.id))} />
              )}
            </article>
            );
          })
        )}
      </div>
    </Layout>
  );
}