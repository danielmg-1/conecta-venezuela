import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-auth";

export type ModSection =
  | "desaparecidos"
  | "centros"
  | "voluntarios"
  | "noticias"
  | "anuncios"
  | "emergencias"
  | "reportes";

export const ALL_SECTIONS: { value: ModSection; label: string; description: string }[] = [
  { value: "desaparecidos", label: "Desaparecidos", description: "Ocultar/mostrar reportes y marcar como verificado." },
  { value: "centros", label: "Centros de ayuda", description: "Gestionar centros de acopio y donaciones." },
  { value: "voluntarios", label: "Voluntarios", description: "Gestionar la lista de voluntarios registrados." },
  { value: "noticias", label: "Noticias", description: "Publicar y editar noticias y artículos." },
  { value: "anuncios", label: "Anuncios globales", description: "Crear avisos visibles en toda la página." },
  { value: "emergencias", label: "Emergencias", description: "Agregar y editar números oficiales de emergencia." },
  { value: "reportes", label: "Reportes e informes", description: "Ver el panel de informes públicos, gráficos y exportar CSV." },
];

export function sectionLabel(s: string) {
  return ALL_SECTIONS.find((x) => x.value === s)?.label ?? s;
}

export function useModeratorPermissions(userId?: string | null) {
  const [sections, setSections] = useState<ModSection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) { setSections([]); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("moderator_permissions")
      .select("section")
      .eq("user_id", userId)
      .then(({ data }) => {
        setSections((data ?? []).map((r) => r.section as ModSection));
        setLoading(false);
      });
  }, [userId]);
  return { sections, loading };
}

export function useCanModerate(userId: string | null | undefined, section: ModSection) {
  const isAdmin = useIsAdmin(userId);
  const { sections, loading } = useModeratorPermissions(userId);
  return { allowed: isAdmin || sections.includes(section), loading };
}