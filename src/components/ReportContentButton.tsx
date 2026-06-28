import { useState } from "react";
import { Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export type ReportableType = "missing_person" | "aid_point" | "news";

const REASONS: { value: string; label: string }[] = [
  { value: "falsa", label: "Información falsa" },
  { value: "duplicada", label: "Publicación duplicada" },
  { value: "desactualizada", label: "Está desactualizada" },
  { value: "ofensiva", label: "Contenido ofensivo" },
  { value: "spam", label: "Spam o publicidad" },
  { value: "otra", label: "Otra razón" },
];

export function ReportContentButton({
  contentType,
  contentId,
  variant = "ghost",
  size = "sm",
  label = "Reportar",
}: {
  contentType: ReportableType;
  contentId: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  label?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("falsa");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user) {
      toast.info("Inicia sesión para reportar contenido.");
      navigate({ to: "/auth" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("content_reports").insert({
      content_type: contentType,
      content_id: contentId,
      reason,
      details: details.trim() || null,
      reporter_id: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo enviar el reporte: " + error.message);
      return;
    }
    toast.success("Gracias, el equipo revisará este contenido.");
    setOpen(false);
    setDetails("");
    setReason("falsa");
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="gap-1.5"
      >
        <Flag className="h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar contenido</DialogTitle>
            <DialogDescription>
              Ayúdanos a mantener información confiable. Tu reporte llega al equipo de moderación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Motivo</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={
                      "rounded-xl border px-3 py-2 text-left text-sm transition " +
                      (reason === r.value ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted")
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="report-details">Detalles (opcional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                placeholder="Cuéntanos qué viste o por qué crees que es incorrecto."
                rows={4}
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">{details.length}/500</div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar reporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}