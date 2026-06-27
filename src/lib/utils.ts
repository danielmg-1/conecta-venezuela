import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha en formato YYYY-MM-DD sin desfase de zona horaria.
 * `new Date("2024-06-07")` se interpreta como UTC y puede mostrar el día anterior
 * en zonas con offset negativo (Venezuela = UTC-4).
 */
export function formatDateOnly(value: string | null | undefined, locale = "es-VE") {
  if (!value) return "";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(value).toLocaleDateString(locale);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString(locale, { timeZone: "UTC" });
}
