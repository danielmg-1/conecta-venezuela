import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  getPublicSupabase,
  jsonResponse,
  parsePagination,
  preflight,
} from "@/lib/public-api.server";

export const Route = createFileRoute("/api/public/centros")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const { limit, page, from, to } = parsePagination(url);
          const supabase = getPublicSupabase();

          let q = supabase
            .from("aid_points")
            .select(
              "id, tipo, nombre, descripcion, direccion, estado, ciudad, lat, lng, telefono, horario, necesidades, cover_photo, created_at, updated_at",
              { count: "exact" }
            )
            .eq("hidden_by_admin", false);

          const tipo = url.searchParams.get("tipo");
          if (tipo) q = q.eq("tipo", tipo as never);
          const estado = url.searchParams.get("estado");
          if (estado) q = q.ilike("estado", estado);
          const ciudad = url.searchParams.get("ciudad");
          if (ciudad) q = q.ilike("ciudad", `%${ciudad}%`);
          const search = url.searchParams.get("q");
          if (search) q = q.ilike("nombre", `%${search}%`);

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