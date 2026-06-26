import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { Trash2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/moderadores")({
  component: Page,
});

type Mod = { user_id: string; email: string; full_name: string | null; granted_at: string };

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [mods, setMods] = useState<Mod[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.rpc("admin_list_users_by_role", { _role: "moderator" });
    if (!error) setMods((data ?? []) as Mod[]);
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.rpc("admin_grant_role_by_email", { _email: email.trim(), _role: "moderator" });
    setLoading(false);
    if (error) { setMsg({ type: "err", text: error.message }); return; }
    setMsg({ type: "ok", text: `Acceso de moderador asignado a ${email}` });
    setEmail("");
    refresh();
  }

  async function revoke(em: string) {
    if (!confirm(`¿Quitar acceso de moderador a ${em}?`)) return;
    const { error } = await supabase.rpc("admin_revoke_role_by_email", { _email: em, _role: "moderator" });
    if (error) { setMsg({ type: "err", text: error.message }); return; }
    refresh();
  }

  if (!isAdmin) return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador puede gestionar moderadores.</p></Layout>;

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Moderadores</h1>
      <p className="mt-1 text-muted-foreground">Los moderadores pueden verificar (ocultar/mostrar) reportes de desaparecidos, centros de ayuda y voluntarios. La persona debe estar registrada en la página con ese correo.</p>

      <form onSubmit={grant} className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Correo del usuario</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="correo@dominio.com" className="rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <ShieldCheck className="h-4 w-4" /> {loading ? "Asignando..." : "Asignar acceso"}
        </button>
        {msg && <p className={`md:col-span-2 rounded-xl p-3 text-sm ${msg.type === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
      </form>

      <h2 className="mt-10 text-xl font-semibold">Moderadores actuales</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Correo</th><th className="p-3">Nombre</th><th className="p-3">Asignado</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {mods.map((m) => (
              <tr key={m.user_id} className="border-t border-border">
                <td className="p-3 font-medium">{m.email}</td>
                <td className="p-3 text-muted-foreground">{m.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(m.granted_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <button onClick={() => revoke(m.email)} className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Quitar
                  </button>
                </td>
              </tr>
            ))}
            {mods.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">Aún no hay moderadores asignados.</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}