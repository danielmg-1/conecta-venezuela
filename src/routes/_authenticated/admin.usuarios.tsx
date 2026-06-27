import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { listAllUsers, type AdminUserRow } from "@/lib/admin-users.functions";
import { Search, Download, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: Page,
});

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" });
}

function toCSV(rows: AdminUserRow[]): string {
  const cols = ["email", "full_name", "created_at", "last_sign_in_at", "email_confirmed_at", "provider", "roles"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(","))].join("\n");
}

function Page() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const fetchUsers = useServerFn(listAllUsers);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers()
      .then((data) => setRows(data))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [isAdmin, fetchUsers]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter && !r.roles.includes(roleFilter)) return false;
      if (!term) return true;
      return (
        (r.email ?? "").toLowerCase().includes(term) ||
        (r.full_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, roleFilter]);

  const counts = useMemo(() => {
    if (!rows) return null;
    return {
      total: rows.length,
      admins: rows.filter((r) => r.roles.includes("admin")).length,
      moderadores: rows.filter((r) => r.roles.includes("moderator")).length,
      confirmados: rows.filter((r) => r.email_confirmed_at).length,
    };
  }, [rows]);

  if (!isAdmin) {
    return <Layout><p className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Solo el administrador.</p></Layout>;
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl"><Users className="h-7 w-7" /> Usuarios registrados</h1>
          <p className="mt-1 text-muted-foreground">Todos los usuarios que se han registrado en la plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted">← Volver al panel</Link>
          <button
            onClick={() => rows && download(`usuarios-${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows))}
            className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {counts && (
        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            ["Total", counts.total],
            ["Confirmados", counts.confirmados],
            ["Moderadores", counts.moderadores],
            ["Admins", counts.admins],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-bold">{v as number}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por correo o nombre…"
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderador</option>
          <option value="user">Usuario</option>
        </select>
      </div>

      {error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Registrado</th>
              <th className="p-3">Último ingreso</th>
              <th className="p-3">Confirmado</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">Sin resultados.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.user_id} className="border-t border-border align-top">
                  <td className="p-3 font-medium">{r.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">{r.email ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {r.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {r.roles.map((role) => (
                        <span key={role} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          role === "admin" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                          : role === "moderator" ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                          : "bg-muted text-muted-foreground"
                        }`}>{role}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.provider ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{fmt(r.created_at)}</td>
                  <td className="p-3 text-muted-foreground">{fmt(r.last_sign_in_at)}</td>
                  <td className="p-3">{r.email_confirmed_at ? "Sí" : <span className="text-amber-600">Pendiente</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}