import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(userId: string | null | undefined, limit = 15) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setItems([]); setUnread(0); setLoading(false); return; }
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    ]);
    setItems((data ?? []) as Notification[]);
    setUnread(count ?? 0);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnread(0);
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  }, [refresh]);

  return { items, unread, loading, refresh, markRead, markAllRead, remove };
}

export const NOTIFICATION_TYPES: { value: string; label: string; description: string }[] = [
  { value: "tip_received", label: "Pistas sobre tus reportes", description: "Cuando alguien deja información sobre una persona que publicaste." },
  { value: "missing_updated", label: "Cambios en tus reportes", description: "Cuando un moderador o admin edita o cambia el estado." },
  { value: "host_invitation", label: "Invitación a anfitrión", description: "Cuando te invitan a coadministrar un centro." },
  { value: "host_response", label: "Respuesta de anfitrión", description: "Cuando alguien acepta o rechaza tu invitación." },
  { value: "aid_point_updated", label: "Cambios en tus centros", description: "Cuando otra persona con permiso edita uno de tus centros." },
  { value: "aid_need_fulfilled", label: "Necesidades cubiertas", description: "Cuando se marca una necesidad como abastecida." },
];

export function notificationTypeLabel(t: string) {
  return NOTIFICATION_TYPES.find((x) => x.value === t)?.label ?? t;
}