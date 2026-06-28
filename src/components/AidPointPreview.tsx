import { useEffect, useState } from "react";
import { MapPin, Phone, Clock, AlertCircle, Globe, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { aidTypeLabel } from "@/lib/aid";
import { getSignedAidPhoto } from "@/lib/photo";
import { contactHref, contactIcon, type ContactKind, type DraftContact } from "@/components/AidContactsSection";

export type PreviewNeed = {
  id?: string;
  title: string;
  details?: string | null;
  priority: "alta" | "media" | "baja";
  fulfilled?: boolean;
};

export type PreviewContact = { kind: ContactKind; value: string; label: string | null };

export type AidPreviewData = {
  tipo: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  ciudad?: string | null;
  direccion?: string | null;
  horario?: string | null;
  telefono?: string | null;
  necesidades?: string | null;
  cover_photo?: string | null;
  contacts?: PreviewContact[] | DraftContact[];
  needs?: PreviewNeed[];
  lat?: number | null;
  lng?: number | null;
};

const PRIORITY_STYLES: Record<string, string> = {
  alta: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  media: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  baja: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
};

export function AidPointPreviewContent({ data }: { data: AidPreviewData }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!data.cover_photo) { setPhotoUrl(null); return; }
    getSignedAidPhoto(data.cover_photo).then((u) => { if (!cancelled) setPhotoUrl(u); });
    return () => { cancelled = true; };
  }, [data.cover_photo]);

  const contacts = (data.contacts ?? []) as PreviewContact[];
  const activeNeeds = (data.needs ?? []).filter((n) => !n.fulfilled);
  const mapsHref = data.lat != null && data.lng != null
    ? `https://www.google.com/maps?q=${data.lat},${data.lng}`
    : data.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([data.direccion, data.ciudad, data.estado, "Venezuela"].filter(Boolean).join(", "))}` : null;

  return (
    <div className="space-y-5">
      {photoUrl && (
        <img src={photoUrl} alt={data.nombre} className="aspect-video w-full rounded-2xl object-cover" />
      )}
      <div>
        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{aidTypeLabel(data.tipo)}</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{data.nombre || "(Sin nombre)"}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> {data.ciudad ? `${data.ciudad}, ` : ""}{data.estado}
        </p>
        {data.direccion && <p className="mt-1 text-sm">{data.direccion}</p>}
      </div>

      {data.descripcion && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{data.descripcion}</p>
      )}

      {data.horario && (
        <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs">
          <Clock className="h-3.5 w-3.5" /> {data.horario}
        </p>
      )}

      {data.necesidades && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Necesita:</strong> {data.necesidades}
        </div>
      )}

      {activeNeeds.length > 0 && (
        <div className="rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-600" /> Necesidades pendientes
          </h3>
          <ul className="mt-3 space-y-2">
            {activeNeeds.map((n, i) => (
              <li key={n.id ?? i} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                  <p className="text-sm font-medium">{n.title}</p>
                </div>
                {n.details && <p className="mt-1 text-xs text-muted-foreground">{n.details}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(contacts.length > 0 || data.telefono) && (
        <div className="rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold">Contacto</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {contacts.length === 0 && data.telefono && (
              <a href={`tel:${data.telefono}`} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium">
                <Phone className="h-3.5 w-3.5" /> {data.telefono}
              </a>
            )}
            {contacts.map((c, i) => {
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
        </div>
      )}

      {mapsHref && (
        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Globe className="h-4 w-4" /> Cómo llegar
        </a>
      )}
    </div>
  );
}

export function AidPointPreviewDialog({ open, onOpenChange, data, title = "Vista previa" }: { open: boolean; onOpenChange: (v: boolean) => void; data: AidPreviewData | null; title?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-3xl overflow-y-auto sm:rounded-3xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Información del punto de ayuda</DialogDescription>
        {data ? <AidPointPreviewContent data={data} /> : <p className="text-sm text-muted-foreground">Cargando…</p>}
      </DialogContent>
    </Dialog>
  );
}

export { X };