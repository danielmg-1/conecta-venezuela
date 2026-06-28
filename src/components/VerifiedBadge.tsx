import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const px = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title="Contenido verificado por el equipo"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-blue-500/10 font-medium text-blue-600 dark:text-blue-400",
        px,
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      Verificado
    </span>
  );
}