import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  getPublicSupabase,
  jsonResponse,
  parsePagination,
  preflight,
} from "@/lib/public-api.server";

export const Route = createFileRoute("/api/public/noticias")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const { limit, page, from, to } = parsePagination(url);
          const supabase = getPublicSupabase();

          let q = supabase
            .from("news")
            .select(
              "id, titulo, contenido, body_html, is_html, photo_path, created_at, updated_at",
              { count: "exact" }
            )
            .eq("published", true);

          const search = url.searchParams.get("q");
          if (search) q = q.ilike("titulo", `%${search}%`);

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