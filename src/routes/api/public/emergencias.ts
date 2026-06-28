import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  getPublicSupabase,
  jsonResponse,
  parsePagination,
  preflight,
} from "@/lib/public-api.server";

export const Route = createFileRoute("/api/public/emergencias")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const { limit, page, from, to } = parsePagination(url, 100, 200);
          const supabase = getPublicSupabase();

          let q = supabase
            .from("emergency_contacts")
            .select("id, categoria, nombre_institucion, telefono, descripcion, orden, created_at", { count: "exact" });

          const categoria = url.searchParams.get("categoria");
          if (categoria) q = q.ilike("categoria", categoria);
          const search = url.searchParams.get("q");
          if (search) q = q.ilike("nombre_institucion", `%${search}%`);

          q = q.order("orden", { ascending: true }).range(from, to);
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