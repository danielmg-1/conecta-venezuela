import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModSection = "desaparecidos" | "centros" | "voluntarios" | "noticias" | "anuncios" | "emergencias";

export const ALL_SECTIONS: { value: ModSection; label: string }[] = [
  { value: "desaparecidos", label: "Desaparecidos" },
  { value: "centros", label: "Centros de ayuda" },
  { value: "voluntarios", label: "Voluntarios" },
  { value: "noticias", label: "Noticias" },
  { value: "anuncios", label: "Anuncios globales" },
  { value: "emergencias", label: "Emergencias" },
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