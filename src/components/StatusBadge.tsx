export type MissingStatus = "desaparecido" | "en_busqueda" | "encontrado";

const styles: Record<MissingStatus, string> = {
  desaparecido: "bg-destructive/10 text-destructive border-destructive/20",
  en_busqueda: "bg-secondary text-secondary-foreground border-secondary",
  encontrado: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const labels: Record<MissingStatus, string> = {
  desaparecido: "Desaparecido",
  en_busqueda: "En búsqueda",
  encontrado: "Encontrado",
};

export function StatusBadge({ status, className = "" }: { status: MissingStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}