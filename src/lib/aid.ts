export const AID_TYPES = [
  { value: "centro_acopio", label: "Centro de acopio" },
  { value: "punto_recaudacion", label: "Punto de recaudación" },
  { value: "hospital", label: "Hospital" },
  { value: "clinica", label: "Clínica" },
  { value: "primeros_auxilios", label: "Primeros auxilios" },
  { value: "apoyo_psicologico", label: "Apoyo psicológico" },
  { value: "otro", label: "Otro" },
] as const;

export type AidType = (typeof AID_TYPES)[number]["value"];

export function aidTypeLabel(t: string): string {
  return AID_TYPES.find((x) => x.value === t)?.label ?? t;
}