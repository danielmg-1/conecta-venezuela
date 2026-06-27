import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  variant: "info" | "warning" | "success" | "danger";
  pages: string[];
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const VARIANT_STYLES: Record<Announcement["variant"], string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-900",
  warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900",
  danger: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-100 dark:border-red-900",
};

const VARIANT_ICON = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertOctagon,
} as const;

function pageKeyFromPath(pathname: string): string {
  if (pathname === "/") return "/";
  const seg = "/" + pathname.split("/").filter(Boolean)[0];
  return seg;
}

export function AnnouncementBanner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("dismissed_announcements") || "[]")); } catch { return new Set(); }
  });

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as Announcement[]);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements, pathname]);

  useEffect(() => {
    const onChanged = () => loadAnnouncements();
    window.addEventListener("announcements:changed", onChanged);
    return () => window.removeEventListener("announcements:changed", onChanged);
  }, [loadAnnouncements]);

  const now = Date.now();
  const pageKey = pageKeyFromPath(pathname);
  const visible = items.filter((a) => {
    if (dismissed.has(a.id)) return false;
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
    if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
    const pages = a.pages?.length ? a.pages : ["*"];
    return pages.includes("*") || pages.includes(pageKey);
  });

  if (!visible.length) return null;

  function dismiss(id: string) {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next);
    try { localStorage.setItem("dismissed_announcements", JSON.stringify([...next])); } catch {}
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6">
      <div className="space-y-2">
        {visible.map((a) => {
          const Icon = VARIANT_ICON[a.variant];
          return (
            <div key={a.id} className={`relative flex items-start gap-3 rounded-2xl border p-4 pr-10 ${VARIANT_STYLES[a.variant]}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{a.title}</p>
                {a.body && <p className="mt-0.5 text-sm opacity-90 whitespace-pre-wrap">{a.body}</p>}
              </div>
              <button onClick={() => dismiss(a.id)} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full p-1 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}