import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM = `Eres Brújula, la guía virtual de Conecta Venezuela. Personalidad cálida, paciente y orientadora. Respondes SIEMPRE en español, con empatía y claridad.

REGLA CRÍTICA: NUNCA inventes datos. Para cualquier pregunta sobre contenido de la plataforma (personas, centros, voluntarios, noticias, emergencias, zonas afectadas, consejos), DEBES usar las herramientas para consultar la base de datos antes de responder. Si la herramienta no devuelve resultados, dilo claramente.

Herramientas disponibles (úsalas proactivamente):
- buscar_personas: personas desaparecidas/en búsqueda/encontradas (tolera errores ortográficos y nombres parciales).
- listar_centros_ayuda: centros de acopio, hospitales, clínicas, donaciones, refugios, primeros auxilios, apoyo psicológico.
- listar_voluntarios: profesionales voluntarios registrados.
- listar_noticias: avisos y noticias publicadas en la plataforma.
- zonas_mas_afectadas: ranking de estados con más reportes.
- consejos_sismo: qué hacer antes/durante/después de un sismo.
- numeros_emergencia: números oficiales de emergencia.

Formato:
- Sé breve (2-6 frases) y usa listas cuando enumeres resultados.
- Para personas, incluye enlace Markdown a /desaparecidos/{id}.
- Para centros, indica nombre, tipo, dirección y teléfono.
- Si no hay resultados, sugiere /desaparecidos/nuevo o /centros-acopio/nuevo según corresponda.
- También puedes orientar sobre cómo usar la plataforma (secciones: /desaparecidos, /mapa, /centros-acopio, /voluntarios, /emergencias, /consejos, /noticias, /perfil).
- Si te preguntan opiniones o política, redirige al tema de la emergencia.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

        const gateway = createLovableAiGatewayProvider(apiKey);

        const tools = {
          buscar_personas: tool({
            description:
              "Busca personas desaparecidas, en búsqueda o encontradas en la base de datos. Tolera nombres parciales o mal escritos. Devuelve hasta 10 resultados con nombre, cédula, estado, lugar y un enlace al perfil.",
            inputSchema: z.object({
              nombre: z.string().optional().describe("Nombre o parte del nombre"),
              cedula: z.string().optional().describe("Número de cédula"),
              estado_lugar: z.string().optional().describe("Estado o ciudad donde desapareció"),
              status: z.enum(["desaparecido", "en_busqueda", "encontrado"]).optional(),
            }),
            execute: async ({ nombre, cedula, estado_lugar, status }) => {
              let q = supabase
                .from("missing_persons")
                .select("id, full_name, cedula, status, last_seen_state, last_seen_location, photo_url, birth_date")
                .limit(10);
              if (cedula) q = q.ilike("cedula", `%${cedula.replace(/\D/g, "")}%`);
              if (status) q = q.eq("status", status);
              if (estado_lugar) {
                q = q.or(
                  `last_seen_state.ilike.%${estado_lugar}%,last_seen_location.ilike.%${estado_lugar}%`,
                );
              }
              if (nombre) {
                const words = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 4);
                if (words.length) {
                  const orParts = words.map((w) => `full_name.ilike.%${w}%`).join(",");
                  q = q.or(orParts);
                }
              }
              const { data, error } = await q;
              if (error) return { error: error.message, resultados: [] };
              return { resultados: data ?? [] };
            },
          }),
          listar_centros_ayuda: tool({
            description:
              "Lista centros de acopio, puntos de recaudación, donaciones, hospitales, clínicas, refugios y puntos de primeros auxilios o apoyo psicológico. Úsala SIEMPRE que pregunten dónde donar, dónde llevar ayuda, centros de acopio, puntos de recaudación o lugares de ayuda. IMPORTANTE: si la pregunta es genérica ('¿dónde puedo donar?', '¿dónde llevo ayuda?'), NO envíes el parámetro 'tipo' — déjalo vacío para traer todos los registros (centros de acopio y puntos de recaudación juntos). Filtra por tipo solo cuando el usuario lo pida explícitamente.",
            inputSchema: z.object({
              tipo: z
                .enum([
                  "centro_acopio",
                  "punto_recaudacion",
                  "hospital",
                  "clinica",
                  "primeros_auxilios",
                  "apoyo_psicologico",
                  "otro",
                ])
                .optional(),
              estado: z.string().optional(),
            }),
            execute: async ({ tipo, estado }) => {
              let q = supabase
                .from("aid_points")
                .select("id, nombre, tipo, estado, ciudad, direccion, telefono, horario, necesidades, descripcion")
                .eq("hidden_by_admin", false)
                .limit(15);
              if (tipo) q = q.eq("tipo", tipo);
              if (estado) q = q.ilike("estado", `%${estado}%`);
              const { data, error } = await q;
              if (error) return { error: error.message, centros: [] };
              return { centros: data ?? [] };
            },
          }),
          zonas_mas_afectadas: tool({
            description:
              "Devuelve un ranking de los estados/zonas con más personas reportadas como desaparecidas o en búsqueda.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase
                .from("missing_persons")
                .select("last_seen_state, status")
                .in("status", ["desaparecido", "en_busqueda"])
                .limit(1000);
              if (error) return { error: error.message, zonas: [] };
              const counts = new Map<string, number>();
              for (const r of data ?? []) {
                const k = (r.last_seen_state || "Sin especificar").trim();
                counts.set(k, (counts.get(k) ?? 0) + 1);
              }
              const zonas = Array.from(counts.entries())
                .map(([estado, total]) => ({ estado, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
              return { zonas };
            },
          }),
          consejos_sismo: tool({
            description:
              "Devuelve consejos de qué hacer antes, durante y después de un sismo, y para mantener la calma.",
            inputSchema: z.object({}),
            execute: async () => ({
              antes: [
                "Prepara una mochila de emergencia con agua, linterna, radio, medicamentos y copias de tus documentos.",
                "Identifica zonas seguras en casa (junto a muros de carga, lejos de ventanas).",
                "Acuerda un punto de encuentro familiar y un contacto fuera del estado.",
              ],
              durante: [
                "Agáchate, cúbrete y agárrate. Protege cabeza y cuello.",
                "No uses ascensores. Aléjate de ventanas, espejos y objetos que puedan caer.",
                "Si estás afuera, ve a un espacio abierto lejos de edificios, postes y cables.",
              ],
              despues: [
                "Revisa heridos y aplica primeros auxilios.",
                "Cierra llaves de gas y agua si hay fugas. No enciendas fósforos.",
                "Atento a réplicas. Sal con calma por las escaleras.",
              ],
              calma: [
                "Respira profundo 4 segundos, sostén 4, exhala 6. Repite 5 veces.",
                "Habla con alguien de confianza. Si la angustia persiste, llama a la línea de apoyo psicológico 0424-1723981 (UCAB).",
              ],
              mas_info: "Visita /consejos para la guía completa.",
            }),
          }),
          numeros_emergencia: tool({
            description: "Devuelve los números oficiales de emergencia en Venezuela.",
            inputSchema: z.object({}),
            execute: async () => ({
              numeros: [
                { servicio: "Emergencias 911", telefono: "911" },
                { servicio: "Protección Civil", telefono: "0800-7248451" },
                { servicio: "Cruz Roja Venezolana", telefono: "0241-8214841" },
                { servicio: "Bomberos", telefono: "171" },
                { servicio: "Apoyo psicológico (UCAB)", telefono: "0424-1723981" },
              ],
              mas_info: "Visita /emergencias para el directorio completo.",
            }),
          }),
          listar_noticias: tool({
            description:
              "Lista las noticias y avisos publicados en la plataforma. Útil cuando preguntan por novedades, comunicados o actualizaciones.",
            inputSchema: z.object({
              buscar: z.string().optional().describe("Palabra clave opcional para filtrar por título o contenido"),
              limite: z.number().int().min(1).max(20).optional(),
            }),
            execute: async ({ buscar, limite }) => {
              let q = supabase
                .from("news")
                .select("id, titulo, contenido, created_at")
                .eq("published", true)
                .order("created_at", { ascending: false })
                .limit(limite ?? 10);
              if (buscar && buscar.trim()) {
                q = q.or(`titulo.ilike.%${buscar}%,contenido.ilike.%${buscar}%`);
              }
              const { data, error } = await q;
              if (error) return { error: error.message, noticias: [] };
              return { noticias: data ?? [] };
            },
          }),
          listar_voluntarios: tool({
            description:
              "Lista voluntarios registrados (profesionales que ofrecen ayuda). Filtra por estado o profesión/habilidad.",
            inputSchema: z.object({
              estado: z.string().optional(),
              profesion: z.string().optional().describe("Profesión o habilidad, p. ej. médico, enfermero, psicólogo"),
            }),
            execute: async ({ estado, profesion }) => {
              let q = supabase
                .from("volunteers")
                .select("id, nombre, profesion, habilidades, estado, ciudad, contacto, disponibilidad, descripcion")
                .eq("hidden_by_admin", false)
                .limit(15);
              if (estado) q = q.ilike("estado", `%${estado}%`);
              if (profesion) {
                q = q.or(`profesion.ilike.%${profesion}%,habilidades.ilike.%${profesion}%`);
              }
              const { data, error } = await q;
              if (error) return { error: error.message, voluntarios: [] };
              return { voluntarios: data ?? [] };
            },
          }),
        };

        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM,
            messages: await convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(8),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (e) {
          console.error("chat error", e);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});