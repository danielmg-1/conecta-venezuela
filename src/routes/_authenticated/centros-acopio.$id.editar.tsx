import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { AID_TYPES } from "@/lib/aid";
import { ESTADOS_VE } from "@/lib/venezuela";
import { MapPicker } from "@/components/MapPicker";
import { UserPlus, X } from "lucide-react";
import { AidContactsSection } from "@/components/AidContactsSection";

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
  const [direccion, setDireccion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    supabase.from("aid_points").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      const r = data as Row | null;
      setRow(r);
      if (r?.lat != null && r?.lng != null) setCoords({ lat: r.lat, lng: r.lng });
      if (r) setDireccion(r.direccion ?? "");
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!user) { setIsHost(false); return; }
    supabase.from("aid_point_hosts").select("status").eq("aid_point_id", id).eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setIsHost(!!data && (data as { status?: string }).status === "accepted");
    });
  }, [user, id]);

  if (loading) return <Layout><p className="text-sm text-muted-foreground">Cargando…</p></Layout>;
  if (!row) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm">No se encontró el centro.</p></Layout>;

  const isOwner = !!user && user.id === row.owner_id;
  const canEdit = isOwner || isAdmin || isHost;
  const canManageHosts = isOwner || isAdmin;
  if (!canEdit) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm">Solo quien publicó este centro, sus anfitriones o el administrador pueden editarlo.</p></Layout>;

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

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Dirección</span>
          <input
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5"
          />
        </label>

        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Ubicación en el mapa</span>
          <p className="text-xs text-muted-foreground">Toca el mapa para ajustar el punto exacto. Arrastra el marcador para moverlo.</p>
          <MapPicker
            value={coords}
            onChange={setCoords}
            onAddressChange={(addr) => { if (!direccion.trim()) setDireccion(addr); }}
          />
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

      {canManageHosts && <HostsSection aidPointId={row.id} />}
      <AidContactsSection aidPointId={row.id} canManage={canEdit} />
    </Layout>
  );
}

function HostsSection({ aidPointId }: { aidPointId: string }) {
  const [hosts, setHosts] = useState<Array<{ user_id: string; email: string; full_name: string | null; invited_at: string; status: string }>>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.rpc("aid_point_list_hosts", { _aid_point_id: aidPointId });
    setHosts((data ?? []) as never);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [aidPointId]);

  async function invite() {
    setErr(null);
    setOkMsg(null);
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("aid_point_add_host_by_email", { _aid_point_id: aidPointId, _email: email.trim() });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOkMsg("Invitación enviada. La persona la verá en su panel ‘Mis reportes’ y podrá aceptarla o rechazarla. No editará el centro hasta aceptar.");
    setEmail("");
    load();
  }

  async function remove(uid: string) {
    if (!confirm("¿Quitar acceso a este anfitrión?")) return;
    const { error } = await supabase.rpc("aid_point_remove_host", { _aid_point_id: aidPointId, _user_id: uid });
    if (error) { alert(error.message); return; }
    load();
  }

  const full = hosts.length >= 4;

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="text-xl font-semibold">Anfitriones</h2>
      <p className="mt-1 text-sm text-muted-foreground">Hasta 4 personas pueden coadministrar este centro. Deben estar registradas en la página. La persona invitada verá la invitación en su panel <strong>Mis reportes</strong> y deberá aceptarla antes de poder editar.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          disabled={full}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-50"
        />
        <button onClick={invite} disabled={busy || full || !email.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <UserPlus className="h-4 w-4" /> Invitar
        </button>
      </div>
      {full && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Alcanzaste el máximo de 4 anfitriones. Quita a alguien para invitar a otra persona.</p>}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      {okMsg && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{okMsg}</p>}

      <ul className="mt-4 divide-y divide-border">
        {hosts.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">Aún no hay anfitriones invitados.</li>
        ) : hosts.map((h) => (
          <li key={h.user_id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{h.full_name || h.email}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  h.status === "accepted" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : h.status === "declined" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                }`}>{h.status === "accepted" ? "Aceptada" : h.status === "declined" ? "Rechazada" : "Pendiente"}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{h.email}</p>
            </div>
            <button onClick={() => remove(h.user_id)} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" /> Quitar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}