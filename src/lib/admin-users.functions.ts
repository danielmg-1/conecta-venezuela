import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string | null;
  roles: string[];
};

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Solo el administrador puede ver los usuarios");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: Array<{
      id: string;
      email?: string | null;
      created_at: string;
      last_sign_in_at?: string | null;
      email_confirmed_at?: string | null;
      app_metadata?: { provider?: string } | null;
    }> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      users.push(...(data.users as typeof users));
      if (data.users.length < 1000) break;
      page++;
      if (page > 20) break;
    }

    const ids = users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids),
    ]);
    const nameMap = new Map<string, string | null>(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]),
    );
    const roleMap = new Map<string, string[]>();
    ((roles ?? []) as Array<{ user_id: string; role: string }>).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    return users
      .map((u) => ({
        user_id: u.id,
        email: u.email ?? null,
        full_name: nameMap.get(u.id) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        provider: u.app_metadata?.provider ?? null,
        roles: (roleMap.get(u.id) ?? []).sort(),
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });