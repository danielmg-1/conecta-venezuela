import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { items, unread, markRead, markAllRead, remove } = useNotifications(user?.id, 10);

  if (!user) return null;

  async function onItemClick(n: Notification) {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={unread > 0 ? `${unread} notificaciones sin leer` : "Notificaciones"}
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tienes notificaciones aún.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const content = (
                  <div className="flex gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read_at ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(n.id); }}
                      aria-label="Eliminar"
                      className="flex-none text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
                return (
                  <li key={n.id} className={n.read_at ? "" : "bg-muted/30"}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => onItemClick(n)}
                        className="block px-4 py-3 hover:bg-muted/50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link to="/perfil" onClick={() => setOpen(false)} className="text-xs font-medium text-foreground hover:underline">
            Ver todas en mi perfil
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}