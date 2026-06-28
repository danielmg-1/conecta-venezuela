import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  getPublicSupabase,
  jsonResponse,
  parsePagination,
  preflight,
} from "@/lib/public-api.server";

const ALLOWED_STATUS = new Set(["desaparecido", "en_busqueda", "encontrado"]);

export const Route = createFileRoute("/api/public/personas")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const { limit, page, from, to } = parsePagination(url);
          const supabase = getPublicSupabase();

          let q = supabase
            .from("missing_persons")
            .select(
              "id, full_name, cedula, birth_date, estado, ciudad, lugar_desaparicion, lat, lng, descripcion, status, photo_path, created_at, updated_at",
              { count: "exact" }
            )
            .eq("public_consent", true)
            .eq("hidden_by_admin", false);

          const status = url.searchParams.get("status");
          if (status) {
            if (!ALLOWED_STATUS.has(status)) return errorResponse("status inválido");
            q = q.eq("status", status as "desaparecido" | "en_busqueda" | "encontrado");
          }
          const estado = url.searchParams.get("estado");
          if (estado) q = q.ilike("estado", estado);
          const ciudad = url.searchParams.get("ciudad");
          if (ciudad) q = q.ilike("ciudad", `%${ciudad}%`);
          const cedula = url.searchParams.get("cedula");
          if (cedula) q = q.eq("cedula", cedula);
          const search = url.searchParams.get("q");
          if (search) q = q.ilike("full_name", `%${search}%`);

          q = q.order("created_at", { ascending: false }).range(from, to);
          const { data, error, count } = await q;
          if (error) return errorResponse(error.message, 500);

          return jsonResponse({
            data: data ?? [],
            pagination: { page, limit, total: count ?? 0, total_pages: count ? Math.ceil(count / limit) : 0 },
          });
        } catch (e) {
          return errorResponse((e as Error).message, 500);
        }
      },
    },
  },
});